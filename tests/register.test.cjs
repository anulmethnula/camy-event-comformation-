const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/register.js');

const valid={
  name:'Test Attendee',
  address:'Test Street',
  city:'Colombo',
  contact:'077 123 4567',
  guests:'2',
  attendance:'Yes',
  registrationId:'CAMY-TEST-12345678'
};

async function run(body=valid,method='POST'){
  const result={
    headers:{},
    setHeader(k,v){this.headers[k]=v;},
    status(code){this.code=code;return this;},
    json(value){this.value=value;return this;}
  };
  await handler({method,body},result);
  return result;
}

test('rejects non-POST and invalid data without writing',async()=>{
  const original=global.fetch;
  global.fetch=()=>{throw new Error('must not write');};
  try{
    assert.equal((await run(valid,'GET')).code,405);
    for(const body of [
      null,
      'bad JSON',
      {...valid,name:' '},
      {...valid,address:' '},
      {...valid,city:' '},
      {...valid,contact:'-------'},
      {...valid,guests:'21'},
      {...valid,guests:'1.5'},
      {...valid,attendance:'No'},
      {...valid,registrationId:'=bad'}
    ]){
      assert.equal((await run(body)).code,400);
    }
  }finally{
    global.fetch=original;
  }
});

test('sends normalized data without email and returns confirmed reference',async()=>{
  const original=global.fetch;
  global.fetch=async(url,options)=>{
    assert.equal(options.redirect,'follow');
    assert.equal(options.body.get('email'),null);
    assert.equal(options.body.get('totalAttendees'),'3');
    assert.equal(options.body.get('name'),'Test Attendee');
    return {ok:true,json:async()=>({success:true,registrationId:valid.registrationId})};
  };

  try{
    const result=await run({...valid,totalAttendees:'900'});
    assert.equal(result.code,200);
    assert.equal(result.value.registrationId,valid.registrationId);
    assert.equal(result.headers['Cache-Control'],'no-store');
  }finally{
    global.fetch=original;
  }
});

test('falls back for an older sheet script that still requires email',async()=>{
  const original=global.fetch;
  let calls=0;

  global.fetch=async(url,options)=>{
    calls++;
    if(calls===1){
      assert.equal(options.body.get('email'),null);
      return {ok:true,json:async()=>({success:false,error:'Invalid email address.'})};
    }

    assert.equal(options.body.get('email'),'not-collected@camy.invalid');
    assert.equal(options.body.get('registrationId'),valid.registrationId);
    return {ok:true,json:async()=>({success:true,registrationId:valid.registrationId})};
  };

  try{
    const result=await run();
    assert.equal(result.code,200);
    assert.equal(result.value.registrationId,valid.registrationId);
    assert.equal(calls,2);
  }finally{
    global.fetch=original;
  }
});

test('does not confirm failures or mismatched references',async()=>{
  const original=global.fetch;
  try{
    for(const response of [
      {ok:false},
      {ok:true,json:async()=>{throw new Error('HTML');}},
      {ok:true,json:async()=>({success:false})},
      {ok:true,json:async()=>({})},
      {ok:true,json:async()=>({success:true,registrationId:'CAMY-WRONG-REFERENCE'})}
    ]){
      global.fetch=async()=>response;
      assert.equal((await run()).code,502);
    }

    global.fetch=async()=>{throw new Error('Network failure');};
    assert.equal((await run()).code,502);
  }finally{
    global.fetch=original;
  }
});
