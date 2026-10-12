import {writeFileSync} from "node:fs";
import {legalDocuments,legalVersion} from "../lib/legal-documents.ts";
for(const [slug,doc] of Object.entries(legalDocuments))writeFileSync("docs/legal/"+slug+".md","# "+doc.title+"\n\nVersion: "+legalVersion+"\n\n**Requires qualified counsel review before production use. Not activated.**\n\n"+doc.paragraphs.join("\n\n")+"\n");
