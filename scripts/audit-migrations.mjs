import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { reviewDatabase } from "./review-db-client.mjs";
const directory="supabase/migrations";
const checksum=sql=>createHash("sha256").update(sql.replaceAll("\r\n","\n")).digest("hex");
let db;
try {
  db=await reviewDatabase();await db.query("begin read only");
  const applied=(await db.query("select name,checksum from private.singgah_migrations order by name")).rows;
  let mismatches=0;
  for(const row of applied){
    const file=directory+"/"+row.name;
    const matches=existsSync(file)&&checksum(readFileSync(file,"utf8"))===row.checksum;
    console.log((matches?"MATCH: ":"MISMATCH: ")+row.name);
    if(!matches){mismatches++;
      if(row.name==="20261014091404_require_reviewer_name.sql"){
        for(const ref of ["f30f27f","204537c"]){
          try{const sql=execFileSync("git",["show",ref+":"+file],{encoding:"utf8",stdio:["ignore","pipe","ignore"]});if(checksum(sql)===row.checksum)console.log("  Hosted checksum matches historical commit "+ref);}
          catch { /* A shallow checkout may omit historical commits. */ }
        }
      }
    }
  }
  for(const name of readdirSync(directory).filter(name=>name.endsWith(".sql")&&!applied.some(row=>row.name===name)).sort())console.log("PENDING: "+name);
  await db.query("rollback");
  if(mismatches)process.exitCode=1;
} catch(error){console.error("Migration audit failed: "+(error.code||"check database access/configuration"));process.exitCode=1;}
finally {await db?.end();}
