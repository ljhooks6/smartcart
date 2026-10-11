import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const directory = path.resolve(import.meta.dirname, '../supabase/auth-templates');
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const variables = source => [...new Set([...source.matchAll(/{{\s*\.([A-Za-z]+)\s*}}/g)].map(match => match[1]))].sort();
const expected = {
  'magic-link-or-otp':['ConfirmationURL'], 'confirm-sign-up':['ConfirmationURL'],
  'invite-user':['ConfirmationURL','SiteURL'], 'reset-password':['ConfirmationURL'],
  'change-email-address':['ConfirmationURL','Email','NewEmail'], 'reauthentication':['Token'],
};
test('auth drafts stay review-only with six known flows and no automatic SMTP application', () => {
  assert.equal(manifest.status, 'review-only-not-applied');
  assert.deepEqual(manifest.sender, { name:'MealCaddie', email:'auth@mealcaddie.app' });
  assert.deepEqual(manifest.templates.map(item => item.id).sort(), Object.keys(expected).sort());
  assert.equal(manifest.templates.filter(item => item.usage.startsWith('dormant')).length, 4);
});
for (const item of manifest.templates) {
  test(`${item.id}: original auth variables and meaningful text survive branding`, () => {
    const body=readFileSync(path.join(directory,item.html),'utf8');
    const plain=readFileSync(path.join(directory,item.plainTextReviewCompanion),'utf8');
    assert.deepEqual(variables(body),expected[item.id].sort());
    assert.deepEqual(variables(plain),expected[item.id].sort());
    assert.deepEqual(item.requiredVariables.sort(),expected[item.id].sort());
    assert.match(item.subject,/MealCaddie/); assert.doesNotMatch(body+plain+item.subject,/SmartCart/i);
    assert.match(body,/<html lang="en">/); assert.match(body,/<h1\b/);
    assert.match(body,/width=device-width/); assert.match(body,/max-width:600px/);
    assert.doesNotMatch(body,/<(?:script|form|iframe|img)\b|\son\w+=|https:\/\//i);
    assert.match(plain,/support@mealcaddie\.app/);
    const hrefs=[...body.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
    if (item.id==='reauthentication') {
      assert.deepEqual(hrefs,['mailto:support@mealcaddie.app']);
      assert.match(plain,/Never share this code/);
      assert.doesNotMatch(body+plain,/[68][- ]digit|CODE_PLACEHOLDER/);
    } else {
      assert.deepEqual(hrefs,['{{ .ConfirmationURL }}','{{ .ConfirmationURL }}','mailto:support@mealcaddie.app']);
      assert.match(body,/padding:14px 22px/); assert.match(body,/text-decoration:underline/);
      assert.match(plain,/used only once/);
    }
  });
}
const luminance=hex=>{
  const channels=hex.match(/[a-f0-9]{2}/gi).map(c=>parseInt(c,16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+0.05)/(values[1]+0.05);};
test('email text, links and CTA colors meet WCAG AA normal-text contrast',()=>{
  for(const [foreground,background] of [['174b3c','ffffff'],['202c28','ffffff'],['202c28','fff7e9']]) assert.ok(contrast(foreground,background)>=4.5);
});
