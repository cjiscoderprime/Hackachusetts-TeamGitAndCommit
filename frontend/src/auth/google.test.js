import test from 'node:test';
import assert from 'node:assert/strict';
import { googleEnabled, beginGoogleSignIn } from './google.js';
test('Google provider availability follows the real project setting',async()=>{
 for(const enabled of [true,false])assert.equal(await googleEnabled({url:'https://project.example/',key:'public-key',fetchImpl:async(url,init)=>{assert.equal(url,'https://project.example/auth/v1/settings');assert.deepEqual(init.headers,{apikey:'public-key'});return new Response(JSON.stringify({external:{google:enabled}}));}}),enabled);
});
test('Google OAuth uses the provider and returns to this app login route',async()=>{
 const client={auth:{signInWithOAuth:async options=>{assert.deepEqual(options,{provider:'google',options:{redirectTo:'https://regulens.example/login'}});return {data:{url:'provider'},error:null};}}};assert.deepEqual(await beginGoogleSignIn(client,'https://regulens.example'),{url:'provider'});
});
test('OAuth startup errors stay readable',async()=>{await assert.rejects(beginGoogleSignIn({auth:{signInWithOAuth:async()=>({error:new Error('Provider disabled')})}},'https://regulens.example'),/Provider disabled/);});
