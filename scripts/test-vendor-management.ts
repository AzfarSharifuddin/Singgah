import assert from "node:assert/strict";
import { test } from "node:test";
import { profileInput, productInput } from "../src/lib/vendor-management/validation.ts";
function form(values: Record<string,string>) { const result=new FormData(); for(const [key,value] of Object.entries(values))result.set(key,value); return result; }
const base={name:" Business ",category_id:"00000001-0000-4000-8000-000000000001",state_id:"00000003-0000-4000-8000-000000000001",city_id:"00000004-0000-4000-8000-000000000001"};
test("profile validation trims input and omits ownership/publication from writes",()=>{
  const result=profileInput(form({...base,owner_user_id:"spoof",status:"published",slug:"spoof",website_url:"example.com",description:"  "}));
  assert.equal(result.name,"Business");assert.equal(result.description,null);assert.equal(result.website_url,"https://example.com/");
  assert.ok(!("owner_user_id" in result));assert.ok(!("status" in result));assert.ok(!("slug" in result));
});
test("invalid hierarchy IDs, links and oversized profile values are rejected",()=>{
  for(const values of [{...base,name:""},{...base,category_id:"invalid"},{...base,description:"a".repeat(5001)},{...base,website_url:"javascript:alert(1)"},{...base,website_url:"https://user:pass@example.com"},{...base,phone:"<script>"}])assert.throws(()=>profileInput(form(values)));
});
test("product price, activation and optional values are validated",()=>{
  assert.deepEqual(productInput(form({name:" Brownie ",price:"0",is_active:"on"})),{name:"Brownie",description:null,price:0,is_active:true});
  assert.equal(productInput(form({name:"Brownie"})).price,null);
  for(const price of ["-1","NaN","12.345","Infinity","1e4"])assert.throws(()=>productInput(form({name:"Brownie",price})));
});
