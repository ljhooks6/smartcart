// Owner-assisted offline check. All upstream/provider responses are mocked.
// The only sockets used by the test are loopback. No API key is requested/read.
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const env={MEALCADDIE_TEST_HTTP:'1'};for(const k of ['PATH','Path','SystemRoot','WINDIR','COMSPEC','PATHEXT','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP'])if(process.env[k])env[k]=process.env[k];
const result=spawnSync(process.execPath,['--experimental-strip-types','--test','tests/local-provider-journey.test.mjs'],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:30000});
const receipt={test:'assignment02d-loopback-sdk-bridge',result:result.status===0?'PASS':'FAIL',exitCode:result.status,externalProviderCalls:0,credentialsUsed:false,syntheticDataOnly:true,finishedAt:new Date().toISOString(),...(result.error?{errorCode:result.error.code||'LOCAL_EXECUTION_FAILURE'}:{})};
const filename=path.join(process.env.USERPROFILE,'Documents','Codex','assignment02d-bridge-verification.json');writeFileSync(filename,JSON.stringify(receipt,null,2));
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');console.log(receipt.result+'; sanitized receipt: '+filename);process.exitCode=result.status===0?0:1;
