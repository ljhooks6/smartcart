import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateAuthRollbackBundle} from '../scripts/auth-rollback-bundle.mjs';
function fixture(){
 const requirements={'magic-link-or-otp':['ConfirmationURL'],'confirm-sign-up':['ConfirmationURL'],'invite-user':['ConfirmationURL','SiteURL'],'change-email-address':['ConfirmationURL','Email','NewEmail'],'reset-password':['ConfirmationURL'],'reauthentication':['Token']};
 const templates=Object.fromEntries(Object.entries(requirements).map(([id,names])=>{
  const body=names.map(name=>`{{ .${name} }}`).join('\r\n');
  return [id,{subject:'Original fixture '+id,body,bodySha256:createHash('sha256').update(body).digest('hex')}];
 }));
 return {backup:{project:'mwxvorzrausbnqzjrhqm',templates},settings:{project:'mwxvorzrausbnqzjrhqm',smtp:{customEnabled:false},rateLimits:{emailPerHour:2,emailLimitNeedsOwnerCapture:false}}};
}
test('rollback bundle preserves all original bodies, line endings, subjects and provider state',()=>{
 const {backup,settings}=fixture();const restored=validateAuthRollbackBundle(backup,settings);
 assert.deepEqual(restored,{templates:backup.templates,settings});
 backup.templates['magic-link-or-otp'].body='changed after packaging';
 assert.notEqual(restored.templates['magic-link-or-otp'].body,backup.templates['magic-link-or-otp'].body);
});
test('rollback readiness refuses missing originals, redacted subjects and unresolved rate configuration',()=>{
 for(const change of [f=>delete f.backup.templates['invite-user'],f=>f.backup.templates['invite-user'].subject=null,f=>f.settings.rateLimits.emailLimitNeedsOwnerCapture=true,f=>f.settings.project='wrong-project']){
  const f=fixture();change(f);assert.throws(()=>validateAuthRollbackBundle(f.backup,f.settings));
 }
});
test('rollback bundle rejects changed bodies or removed authentication variables',()=>{
 const f=fixture();f.backup.templates.reauthentication.body='No verification variable';
 assert.throws(()=>validateAuthRollbackBundle(f.backup,f.settings),/checksum/);
 f.backup.templates.reauthentication.bodySha256=createHash('sha256').update(f.backup.templates.reauthentication.body).digest('hex');
 assert.throws(()=>validateAuthRollbackBundle(f.backup,f.settings),/variables/);
});
