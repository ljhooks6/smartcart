import {createHash} from 'node:crypto';
const requirements={
  'magic-link-or-otp':['ConfirmationURL'], 'confirm-sign-up':['ConfirmationURL'],
  'invite-user':['ConfirmationURL','SiteURL'], 'change-email-address':['ConfirmationURL','Email','NewEmail'],
  'reset-password':['ConfirmationURL'], 'reauthentication':['Token'],
};
export function validateAuthRollbackBundle(backup,settings){
  if(settings?.project!=='mwxvorzrausbnqzjrhqm'||backup?.project!==settings.project||settings.smtp?.customEnabled!==false)throw Error('Unexpected original project or SMTP state. Re-export before proceeding.');
  if(settings.rateLimits?.emailLimitNeedsOwnerCapture || !Number.isInteger(settings.rateLimits?.emailPerHour))throw Error('Original email rate setting is incomplete.');
  if(Object.keys(backup.templates??{}).sort().join(',')!==Object.keys(requirements).sort().join(','))throw Error('All six original templates are required.');
  for(const [id,required] of Object.entries(requirements)){
    const value=backup.templates[id];
    if(!value?.subject?.trim()||!value.body?.trim())throw Error(`Original subject/body missing: ${id}`);
    if(createHash('sha256').update(value.body).digest('hex')!==value.bodySha256)throw Error(`Original body checksum mismatch: ${id}`);
    const variables=[...new Set([...value.body.matchAll(/{{\s*\.([A-Za-z]+)\s*}}/g)].map(m=>m[1]))].sort();
    if(variables.join(',')!==[...required].sort().join(','))throw Error(`Original variables changed: ${id}`);
  }
  // Return an immutable independent copy for review, never apply remotely.
  return JSON.parse(JSON.stringify({templates:backup.templates,settings}));
}
