"""Compile audited public architecture into compact, fictional template definitions.

Audit files keep source URLs/evidence separately. Generated customer content contains
fictional labels only; aliases are mapped to destinations, never copied as bodies.
"""
import json,re,sys
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
AUDIT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'template-review/full-site-audit'
if not AUDIT.is_dir():
 raise SystemExit('Audit inputs are not bundled with the deployed app. Pass an audit directory as the first argument. The generated lib/reference-inventory.ts is already included and does not need recompilation.')
replacements={r'international community school(?: \(singapore\))?':'Harborlight International Academy',r'southwest dubois(?: county)?(?: school corporation)?':'Maple County Schools',r'greece central school district':'Lakeview Community Schools',r'horizon community middle school':'Willow Creek Middle School',r'eaglecrest high school':'Redstone High School',r'crane country day school':'Cedar Grove Day School',r'cherry creek(?: school district)?':'Willow Valley',r'\bsau\s*70\b':'Meadowbrook',r'\bcrane\b':'Cedar Grove',r'\bgreece\b':'Lakeview',r'\bathena\b':'Summit Ridge',r'\bhorizon\b':'Willow Creek',r'\beaglecrest\b':'Redstone',r'\bdubois\b':'Maple County',r'\bgreenwich\b':'Brookfield',r'\bics\b':'Harborlight',r'\bgps\b':'Brookfield',r'\b(ccsd|cherrycreek)\b':'Willow Valley',r'\bhcms\b':'Willow Creek',r'\behs\b':'Redstone',r'\bhanover\b':'Meadowbrook',r'\bnorwich\b':'Pine Valley',r'\bdresden\b':'Meadow Union',r'\bmarion cross\b':'Maplewood',r'\brichmond\b':'Ridgeview',r'\bbern(ice)?[ -]?a[ .-]*ray\b':'Oakfield',r'\bbrittingham\b':'Community',r'\blejeune\b':'Founders',r'\buknighted\b':'Community',r'\bknight(s)?\b':'Owl',r'\braptor(s)?\b':'Raven',r'\bhusky|huskies\b':'Wildcat',r'\bdundee\b':'Cedarwood',r'\bbelle haven\b':'Harbor View',r'\bcos cob\b':'Meadow Park',r'\bhamilton avenue\b':'Willow Avenue',r'\bjulian curtiss\b':'Pinecrest',r'\bglennville\b':'Brookside',r'\briverside\b':'Riverbend',r'\bfleischman\b':'Community',r'\bholland\b':'Maplewood',r'\bhuntingburg\b':'Oak Valley',r'\bsouthridge\b':'South Valley'}
replacements.update({r'\b(?:bern(?:ice)?[ .-]*)?(?:a[ .-]*)?ray\b':'Oakfield',r'\bfrances(?: c)?\b':'Riverbend'})
def clean(value):
 for pattern,replacement in replacements.items():value=re.sub(pattern,replacement,value,flags=re.I)
 value=re.sub(r'(?i).*https?www.*','Community resource',value)
 value=re.sub(r'(?i)mycherrycreek','Community portal',value)
 value=re.sub(r'\s*-\s*20\d\d[_ -].*$','',value)
 value=re.sub(r'\s+',' ',value).strip()
 return value[:100] or 'Community resources'
def slug(value):return re.sub(r'[^a-z0-9]+','-',value.lower()).strip('-')[:65].rstrip('-') or 'resource'
def canonical(url):return (url or '').rstrip('/')
def kind(page,title):
 raw=page.get('kind','').lower();term=(title+' '+raw).lower()
 if raw=='home':return 'home'
 if re.search(r'404|not-found|error',raw):return 'utility'
 if re.search(r'login|auth|portal',term):return 'portal'
 if re.search(r'sitemap|site map',term):return 'sitemap'
 if re.search(r'directory|staffulty|leadership|coaches|members|our team',term):return 'directory'
 if re.search(r'calendar|events',term):return 'calendar'
 if re.search(r'news-detail|post-detail|event-detail|\bdetail\b',raw):return 'article'
 if re.search(r'live.feed',term):return 'feed'
 if re.search(r'news|newsletter|updates|weekly message',term):return 'news'
 if re.search(r'fee|tuition|price|dining|lunch|meal',term):return 'fees'
 if re.search(r'schedule|bell time',term):return 'schedule'
 if re.search(r'form|inquir|application|registration',term):return 'form'
 if re.search(r'contact|directions|location',term):return 'contact'
 if re.search(r'faq|accordion|question',term):return 'faq'
 if re.search(r'polic|posting|compliance|handbook|guideline',term):return 'policies'
 if re.search(r'document|resource.library|minutes|agenda|report|budget',term):return 'resources'
 if re.search(r'history|timeline',term):return 'timeline'
 if re.search(r'admission|enroll|apply',term):return 'admissions'
 if re.search(r'board|governance',term):return 'board'
 if re.search(r'gallery|media|video',term):return 'gallery'
 if re.search(r'program|academic|education|curriculum|athletic|sport|counsel',term):return 'program'
 if re.search(r'department|service|operations|division|bureau',term):return 'department'
 return 'overview'
module_map={'accordion':'accordion','tabs':'tabs','tab':'tabs','table':'table','fsAccordion':'accordion','fsTabs':'tabs','fsConstituent':'directory','fsDirectory':'directory','people-directory':'directory','staff-directory':'directory','constituent-directory':'directory','fsCalendar':'calendar','calendar':'calendar','fsPostElement':'news','filterable-posts':'feed','post-feed':'feed','post-grid':'news','document-library':'documents','documents':'documents','video':'video','fsResourceTypeVideo':'video','form':'form','forms':'form','fsForm':'form','image-gallery':'gallery','gallery':'gallery','timeline':'timeline'}
result={};coverage={}
for template_id in ['sau70','crane','greece','athena','horizon','eaglecrest','dubois','ics','greenwich','police']:
 file=AUDIT/(template_id+'.json')
 if not file.exists():continue
 data=json.loads(file.read_text());original=data['pages'];evidence_file=AUDIT/(template_id+'-evidence.json');evidence=json.loads(evidence_file.read_text()) if evidence_file.exists() else {};checks={canonical(c['url']):c.get('structure',{}) for c in evidence.get('checks',[]) if c.get('structure')};pages=[];url_to_key={};alias_urls={}
 for i,p in enumerate(original):
  url=canonical(p['url']);key='r'+str(i)
  # Structural aliases still need a navigable folder to preserve descendants.
  if p.get('aliasOf') and not p.get('structuralFolder'):
   alias_urls[url]=canonical(p['aliasOf']);continue
  url_to_key[url]=key
  structure=checks.get(url,p.get('structure',{}));p={**p,'structure':structure};
  title=clean(structure.get('pageTitle') or p.get('suggestedDummyLabel') or p.get('proposedLabel') or p['title'])
  k=kind(p,title)
  if re.search(r'bell-schedules?|daily-schedules?',url):k='schedule';title='Bell Schedules'
  if structure.get('tables') and k in ['overview','program','calendar']:k='schedule'
  if k=='home':title='Home'
  if k=='article':title=('Event information' if 'event' in p.get('kind','') else 'Community story')+' '+str(i+1)
  if re.search(r'person|wanted|profile',p.get('kind',''),re.I):title='Fictional training profile '+str(i+1)
  raw_modules=p.get('components',[]) or p.get('structure',{}).get('components',{})
  if isinstance(raw_modules,dict):raw_modules=list(raw_modules)
  modules=[]
  for m in raw_modules:
   if not isinstance(m,str):continue
   mapped=module_map.get(m)
   if mapped and mapped not in modules:modules.append(mapped)
  pages.append({'key':key,'title':title,'kind':k,'nav':bool(p.get('navigation')),'modules':modules,'parentUrl':canonical(p.get('parentUrl')),'parentGroup':p.get('parentGroup'),'source':url,'navLabel':clean(p.get('proposedLabel') or p['title']) if title!=clean(p.get('proposedLabel') or p['title']) else None,'legacy':bool(p.get('historicalOrUtility') or 'legacy' in p.get('kind',''))})
 for group in data.get('navigationGroups',[]):
  pages.append({'key':'g-'+group['key'],'title':clean(group['title']),'kind':'overview','nav':True,'modules':[],'parentGroup':group.get('parentGroup'),'source':'group:'+group['key'],'legacy':False})
 # Follow confirmed aliases only when their destination belongs to this template.
 for alias,target in alias_urls.items():
  visited=set()
  while target in alias_urls and target not in visited:visited.add(target);target=alias_urls[target]
  if target in url_to_key:url_to_key[alias]=url_to_key[target]
 # Retain external alias destinations as editable local resource landing pages.
 for i,p in enumerate(original):
  url=canonical(p['url'])
  if url not in url_to_key and url in alias_urls:
   key='r'+str(i);url_to_key[url]=key
   pages.append({'key':key,'title':clean(p.get('suggestedDummyLabel') or p.get('proposedLabel') or p['title']),'kind':'portal','nav':bool(p.get('navigation')),'modules':[],'parentUrl':canonical(p.get('parentUrl')),'parentGroup':p.get('parentGroup'),'source':url,'legacy':False})
 used=set();compiled=[];mapping=[]
 for p in pages:
  address=slug(p['title']);base=address;n=2
  while address in used:address=base+'-'+str(n);n+=1
  used.add(address)
  parent='g-'+p['parentGroup'] if p.get('parentGroup') else url_to_key.get(p.get('parentUrl',''))
  record={'key':p['key'],'title':p['title'],'slug':address,'kind':p['kind']}
  if parent and parent!=p['key']:record['parent']=parent
  if p['nav']:record['nav']=True
  if p.get('navLabel'):record['navLabel']=p['navLabel']
  if p['modules']:record['modules']=p['modules']
  if p['legacy']:record['legacy']=True
  compiled.append(record);mapping.append({'source':p['source'],'slug':address,'kind':p['kind'],'key':p['key']})
 result[template_id]=compiled;coverage[template_id]={'discoveredRoutes':len(original),'templateRoutes':len(compiled),'confirmedAliases':len(alias_urls),'sourceCoverage':data.get('coverage',{}),'routeMapping':mapping}
out='// Generated by scripts/compile-reference-inventory.py from audited public structure.\nexport type ReferencePageSpec={key:string;title:string;slug:string;kind:string;parent?:string;nav?:boolean;modules?:string[];legacy?:boolean;navLabel?:string};\nexport const referenceInventory:Record<string,ReferencePageSpec[]>='+json.dumps(result,separators=(',',':'),ensure_ascii=False)+';\n'
(ROOT/'lib/reference-inventory.ts').write_text(out)
(AUDIT/'compiled-coverage.json').write_text(json.dumps(coverage,indent=2,ensure_ascii=False))
print(json.dumps({k:len(v) for k,v in result.items()}))
