// Adds an entry to the top of dist/data/changelog.json, the list behind the guide's What's new button.
//
//   node scripts/add-change.mjs "Title players will read" ["One note per argument" ...]
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {validateChangelog} from '../dist/core.js';
export const changelogPath=fileURLToPath(new URL('../dist/data/changelog.json',import.meta.url));
// Returns the list with the new entry first, or unchanged when the same title was already written up today.
export function addChange(rows,title,notes=[],today=new Date()){
  validateChangelog(rows);
  const date=today.toISOString().slice(0,10),clean=String(title||'').trim();
  if(!clean)throw new Error('Describe the change in a few words.');
  if(rows.some(row=>row.date===date&&row.title===clean))return rows;
  const base=date+'-'+(clean.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'change');
  let id=base,n=2;while(rows.some(row=>row.id===id))id=base+'-'+n++;
  const entry={id,date,title:clean};
  const cleanNotes=notes.map(note=>String(note).trim()).filter(Boolean);
  if(cleanNotes.length)entry.notes=cleanNotes;
  const next=[entry,...rows];
  validateChangelog(next);
  return next;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [title,...notes]=process.argv.slice(2);
  try{
    const rows=JSON.parse(await readFile(changelogPath,'utf8')),next=addChange(rows,title,notes);
    if(next===rows){console.log('The changelog already has this change for today.');}
    else{await writeFile(changelogPath,JSON.stringify(next,null,2)+'\n');console.log('Added to What’s new: '+next[0].title);}
  }catch(error){console.error(error.message);process.exitCode=1;}
}
