import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
// Execute the actual server action with controlled external I/O. Hosted permission
// and transaction behavior are covered separately by test:product-cleanup-db.
function action({ existing=false, cleanup={data:true,error:null} }={}) {
  const calls=[];
  const client={
    rpc:async(name,args)=>{calls.push({name,args});return cleanup;},
    from:()=>({
      select(){return this;},eq(){return this;},
      maybeSingle:async()=>({data:{id:"owned-product"},error:null}),
      insert(){calls.push({name:"insert"});return this;},
      single:async()=>({data:{id:"new-product"},error:null}),
      delete(){throw new Error("Direct product deletion must never be used");},
    }),
  };
  const modules={
    "next/navigation":{redirect:()=>{throw new Error("unexpected redirect");}},
    "next/cache":{revalidatePath:path=>calls.push({name:"revalidate",path})},
    "next/headers":{},
    "@/lib/supabase/vendor":{requireBusiness:async()=>({client,id:"derived-owner-business"})},
    "./validation":{productInput:()=>({name:"Test",is_active:true}),identifier:()=>existing?"owned-product":null},
    "./media-actions":{uploadImage:async()=>({message:"Image decoding failed."})},
  };
  const source=readFileSync(new URL("../src/lib/vendor-management/actions.ts",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(compiled,{exports,require:name=>{assert.ok(name in modules,name);return modules[name];},File,FormData,console});
  const form=new FormData();form.set("file",new File(["fixture"],"product.png",{type:"image/png"}));
  return {run:()=>exports.saveProduct({message:""},form),calls};
}
test("failed new upload invokes only scoped cleanup and refreshes products",async()=>{
  const fixture=action();const result=await fixture.run();assert.equal(result.message,"Image decoding failed.");
  assert.deepEqual(fixture.calls.filter(c=>c.name==="discard_unfinished_product").map(c=>c.args.p_product),["new-product"]);
  assert.ok(fixture.calls.some(c=>c.name==="revalidate"&&c.path==="/dashboard/products"));
});
test("failed or refused cleanup tells the vendor the inactive item remains",async()=>{
  for(const cleanup of [{data:false,error:null},{data:null,error:{code:"42501"}}]){
    const fixture=action({cleanup});const result=await fixture.run();assert.match(result.message,/inactive item was kept/);assert.ok(!result.ok);
  }
});
test("replacement upload failure never removes an existing product",async()=>{
  const fixture=action({existing:true});assert.equal((await fixture.run()).message,"Image decoding failed.");
  assert.ok(!fixture.calls.some(c=>c.name==="discard_unfinished_product"||c.name==="insert"));
});
