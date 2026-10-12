import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {fixture,admin,free,plus,paid,stranger,root,server,browser,approved,issued,activated} from './helpers/beta-onboarding-fixture.mjs';

test('new recipient must verify its exact email before an initially unbound invitation activates',async()=>{
 const db=await fixture();try{
 await root(db);await db.query('delete from auth.users where id=$1',[free]);
 const invitation=await issued(db,free);assert.equal((await db.query('select bound_user_id from beta_invitations')).rows[0].bound_user_id,null);
 const id=randomUUID();await root(db);await db.query('insert into auth.users values($1,$2,null,null,false)',[id,'free@example.invalid']);await db.query('insert into smartcart_profiles values($1,$2,$3,null)',[id,'free@example.invalid','free']);await server(db);
 await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[id,invitation.hash]),/verified account/);
 await root(db);await db.query('update auth.users set email_confirmed_at=now(),confirmed_at=now() where id=$1',[id]);await server(db);await db.query('select beta_accept_invitation($1,$2)',[id,invitation.hash]);
 assert.equal((await db.query('select user_id from beta_participations')).rows[0].user_id,id);
 await root(db);await db.exec("update beta_programs set beta_ended_at=now()");await server(db);assert.equal((await db.query('select beta_effective_plan($1) plan',[paid])).rows[0].plan,'plus');
 }finally{await db.close();}
});

test('complete Free journey: verified invitation, replay-safe activation, five vault slots, feedback without analytics',async()=>{
 const db=await fixture();try{
 const invitation=await issued(db,free);await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[stranger,invitation.hash]),/wrong recipient/);
 const first=(await db.query('select beta_accept_invitation($1,$2) r',[free,invitation.hash])).rows[0].r;assert.equal(first.cohort,'free');
 assert.equal((await db.query('select beta_accept_invitation($1,$2) r',[free,invitation.hash])).rows[0].r.alreadyAccepted,true);
 assert.equal((await db.query('select count(*)::int n from beta_participations')).rows[0].n,1);
 await browser(db,free);for(let n=0;n<5;n++)await db.query('insert into archived_meals(user_id,name) values($1,$2)',[free,'Synthetic recipe']);
 await assert.rejects(db.query('insert into archived_meals(user_id,name) values($1,$2)',[free,'Sixth']),/five vault/);
 await assert.rejects(db.query('insert into pantry_inventory(user_id,ingredient_name) values($1,$2)',[free,'Synthetic pantry']),/requires Plus/);
 await server(db);const key=randomUUID();await db.query('select beta_submit_feedback($1,$2,$3,$4,$5)',[free,'bug','onboarding','The synthetic test button is confusing',key]);
 await db.query('select beta_submit_feedback($1,$2,$3,$4,$5)',[free,'bug','onboarding','Duplicate retry must not overwrite',key]);
 assert.equal((await db.query('select count(*)::int n from beta_feedback')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from beta_engagement_events')).rows[0].n,0);
 assert.equal((await db.query('select plan from smartcart_profiles where id=$1',[free])).rows[0].plan,'free');await root(db);assert.equal((await db.query('select status from smartcart_subscriptions')).rows[0].status,'active');
 }finally{await db.close();}
});
test('temporary Plus journey: storage, optional reporting, expiry preserves content and paid Plus, no subscription created',async()=>{
 const db=await fixture();try{
 const p=await activated(db,plus,'plus');await browser(db,plus);for(let n=0;n<7;n++)await db.query('insert into archived_meals(user_id,name) values($1,$2)',[plus,'Synthetic']);await db.query('insert into pantry_inventory(user_id,ingredient_name) values($1,$2)',[plus,'Synthetic']);
 await server(db);await db.query('select beta_participant_settings($1,true,false)',[plus]);const key=randomUUID();await db.query("select beta_record_engagement($1,'plan_completed',$2)",[plus,key]);await db.query("select beta_record_engagement($1,'plan_completed',$2)",[plus,key]);assert.equal((await db.query('select sum(total)::int n from beta_engagement_daily')).rows[0].n,1);
 await db.query('select beta_participant_settings($1,false,false)',[plus]);assert.equal((await db.query('select count(*)::int n from beta_engagement_daily')).rows[0].n,0);
 await root(db);await db.query("update beta_participations set activated_at=now()-interval '31 days',expires_at=now()-interval '1 second' where id=$1",[p.id]);await server(db);assert.equal((await db.query('select beta_effective_plan($1) plan',[plus])).rows[0].plan,'free');assert.equal((await db.query('select beta_effective_plan($1) plan',[paid])).rows[0].plan,'plus');
 await browser(db,plus);assert.equal((await db.query('select count(*)::int n from archived_meals')).rows[0].n,7);await db.exec("update archived_meals set name='Retained edit'");await assert.rejects(db.query('insert into archived_meals(user_id,name) values($1,$2)',[plus,'Denied']),/five vault/);await assert.rejects(db.exec("update pantry_inventory set ingredient_name='Denied'"),/requires Plus/);await db.exec('delete from archived_meals');
 await server(db);assert.equal((await db.query('select plan from smartcart_profiles where id=$1',[plus])).rows[0].plan,'free');await root(db);assert.equal((await db.query('select count(*)::int n from smartcart_subscriptions')).rows[0].n,1);
 }finally{await db.close();}
});
test('expired, revoked, unverified and spoofed recipients cannot activate; browser RPCs and ownership cannot be bypassed',async()=>{
 const db=await fixture();try{
 const invite=await issued(db,free);await root(db);await db.query("update beta_invitations set expires_at=now()-interval '1 second' where id=$1",[invite.id]);await server(db);await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[free,invite.hash]),/expired/);
 await root(db);await db.query("update beta_invitations set expires_at=now()+interval '1 day' where id=$1",[invite.id]);await db.query('update auth.users set email_confirmed_at=null where id=$1',[free]);await server(db);await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[free,invite.hash]),/verified account/);
 await root(db);await db.query('update auth.users set email_confirmed_at=now() where id=$1',[free]);await server(db);await db.query('select beta_revoke_invitation($1,$2)',[admin,invite.id]);await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[free,invite.hash]),/invalid/);
 for(const role of ['anon','authenticated']){await root(db);await db.exec('set role '+role);for(const t of ['beta_invitations','beta_participations','beta_feedback','beta_engagement_events','beta_invitation_deliveries'])await assert.rejects(db.query('select * from '+t),/permission denied/);await assert.rejects(db.query('select beta_effective_plan($1)',[paid]),/permission denied/);await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[free,invite.hash]),/permission denied/);}
 await root(db);await db.query('insert into archived_meals(user_id,name) values($1,$2)',[paid,'Other owner']);await browser(db,free);assert.equal((await db.query('select * from archived_meals')).rows.length,0);await assert.rejects(db.query('insert into archived_meals(user_id,name) values($1,$2)',[paid,'Spoofed']),/Verified account|row-level security/);
 }finally{await db.close();}
});
test('rolling resend limits, cooldown and unknown delivery never yield automatic retries or active grants',async()=>{
 const db=await fixture();try{
 const a=await approved(db,free);const id=(await db.query('select beta_issue_invitation($1,$2) id',[admin,a.id])).rows[0].id;
 await assert.rejects(db.query('select beta_issue_invitation($1,$2)',[admin,a.id]),/cooldown/);
 for(let n=0;n<3;n++){await root(db);await db.exec("update beta_invitations set created_at=created_at-interval '25 hours'");await server(db);await db.query('select beta_issue_invitation($1,$2)',[admin,a.id]);}
 await root(db);await db.exec("update beta_invitations set created_at=created_at-interval '25 hours'");await server(db);await assert.rejects(db.query('select beta_issue_invitation($1,$2)',[admin,a.id]),/resend limit/);
 const claim=(await db.query('select beta_claim_delivery($1) r',['a'.repeat(64)])).rows[0].r;await db.query('select beta_finish_delivery($1,$2,null)',[claim.id,'unknown']);await assert.rejects(db.query('select beta_accept_invitation($1,$2)',[free,'a'.repeat(64)]),/invalid/);assert.equal((await db.query('select count(*)::int n from beta_participations')).rows[0].n,0);assert.notEqual(claim.id,id);
 }finally{await db.close();}
});
test('admin promotion preserves expiry, explicit bounded extension, revocation and withdrawal preserve billing/content',async()=>{
 const db=await fixture();try{
 const p=await activated(db,free);const original=p.expires_at;
 await assert.rejects(db.query("select beta_manage_participation($1,$2,'promote','Testing',null)",[stranger,p.id]),/admin/);
 await db.query("select beta_manage_participation($1,$2,'promote','Selected for Plus',null)",[admin,p.id]);assert.equal((await db.query('select expires_at from beta_participations')).rows[0].expires_at.getTime(),original.getTime());assert.equal((await db.query('select beta_effective_plan($1) plan',[free])).rows[0].plan,'plus');
 await assert.rejects(db.query("select beta_manage_participation($1,$2,'extend','More testing',now()+interval '61 days')",[admin,p.id]),/boundary/);
 await db.query("select beta_manage_participation($1,$2,'extend','More testing',now()+interval '40 days')",[admin,p.id]);
 await browser(db,free);await db.query('insert into archived_meals(user_id,name) values($1,$2)',[free,'Retained']);await server(db);
 await db.query('select beta_participant_settings($1,true,false)',[free]);await db.query("select beta_record_engagement($1,'plan_completed',$2)",[free,randomUUID()]);await db.query('select beta_participant_settings($1,false,true)',[free]);assert.equal((await db.query('select beta_effective_plan($1) plan',[free])).rows[0].plan,'free');await assert.rejects(db.query('select beta_submit_feedback($1,$2,$3,$4,$5)',[free,'bug','other','No feedback after withdrawal',randomUUID()]),/participation/);
 await browser(db,free);assert.equal((await db.query('select count(*)::int n from archived_meals')).rows[0].n,1);await root(db);assert.equal((await db.query('select count(*)::int n from beta_engagement_events')).rows[0].n,0);assert.equal((await db.query('select status from smartcart_subscriptions')).rows[0].status,'active');
 }finally{await db.close();}
});
test('retention purges only eligible beta data; raw 30-day events and 90-day feedback; accounts/content persist',async()=>{
 const db=await fixture();try{
 const p=await activated(db,plus,'plus');await db.query('select beta_participant_settings($1,true,false)',[plus]);await db.query('select beta_submit_feedback($1,$2,$3,$4,$5)',[plus,'usability','vault','Synthetic retention feedback',randomUUID()]);await root(db);await db.exec("update beta_engagement_events set created_at=now()-interval '31 days'");await server(db);await db.query('select beta_onboarding_cleanup()');assert.equal((await db.query('select count(*)::int n from beta_engagement_events')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from beta_feedback')).rows[0].n,1);
 await root(db);await db.exec("update beta_programs set beta_ended_at=now()-interval '91 days'");await server(db);await db.query('select beta_onboarding_cleanup()');assert.equal((await db.query('select count(*)::int n from beta_feedback')).rows[0].n,0);await db.query('select beta_cleanup($1)',[admin]);assert.equal((await db.query('select count(*)::int n from beta_participations')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from smartcart_profiles')).rows[0].n,5);
 }finally{await db.close();}
});
test('delivery callbacks deduplicate, cannot activate and late notifications cannot overwrite a complaint',async()=>{const db=await fixture();try{const invitation=await issued(db,free);const delivery=(await db.query('select * from beta_invitation_deliveries where invitation_id=$1',[invitation.id])).rows[0];await db.query("select beta_delivery_event('test-event',$1,'delivered')",[delivery.provider_id]);await db.query("select beta_delivery_event('test-event',$1,'delivered')",[delivery.provider_id]);assert.equal((await db.query('select count(*)::int n from beta_delivery_events')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from beta_participations')).rows[0].n,0);await db.query("select beta_delivery_event('complaint',$1,'complained')",[delivery.provider_id]);await db.query("select beta_delivery_event('late-delivered',$1,'delivered')",[delivery.provider_id]);assert.equal((await db.query('select status from beta_invitation_deliveries')).rows[0].status,'complained');}finally{await db.close();}});
