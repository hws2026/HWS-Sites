import type {Website} from './editor-model';
import {database} from './suite-store';

export const visitorWebsite=(site:Website):Website=>({...site,library:[],pages:site.pages.map(page=>({...page,blocks:page.blocks.filter(block=>!block.hidden)}))});
export async function publicationUrl(id:string,origin:string){
 const primary=await database().prepare("SELECT hostname FROM site_domains WHERE site_id=? AND status='active' AND is_primary=1").bind(id).first<{hostname:string}>();
 return primary?'https://'+primary.hostname+'/':origin+'/sites/'+encodeURIComponent(id)+'/';
}
export async function publicSnapshot(id:string){
 const row=await database().prepare('SELECT s.published FROM client_sites s JOIN site_publications p ON p.site_id=s.id WHERE s.id=? AND s.archived=0 AND p.enabled=1 AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id=s.customer_id AND c.owner=s.owner AND c.archived!=0)').bind(id).first<{published:string|null}>();
 return row?.published?visitorWebsite(JSON.parse(row.published) as Website):null;
}
