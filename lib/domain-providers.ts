// Account links and setup guides are public provider destinations, never user input.
// A catalog entry does not imply that the provider offers automatic DNS access.
export const domainProviders=[
 {id:'godaddy',name:'GoDaddy',account:'https://dcc.godaddy.com/manage/dns',help:'https://www.godaddy.com/help/manage-dns-records-680'},
 {id:'cloudflare',name:'Cloudflare',account:'https://dash.cloudflare.com/',help:'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/'},
 {id:'ionos',name:'IONOS',account:'https://login.ionos.com/',help:'https://www.ionos.com/help/domains/glossary-important-terms-and-topics-explained/domainconnect/'},
 {id:'wix',name:'Wix',account:'https://manage.wix.com/account/domains',help:'https://support.wix.com/en/article/managing-dns-records-in-your-wix-account'},
 {id:'webcom',name:'Web.com / Network Solutions',account:'https://www.networksolutions.com/my-account/login',help:'https://www.networksolutions.com/help/article/manage-dns-adns-records'},
 {id:'namecheap',name:'Namecheap',account:'https://www.namecheap.com/myaccount/login/',help:'https://www.namecheap.com/support/knowledgebase/article.aspx/434/2237/how-do-i-set-up-host-records-for-a-domain/'},
 {id:'squarespace',name:'Squarespace',account:'https://account.squarespace.com/domains',help:'https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-DNS-records-to-your-domain'},
 {id:'hostinger',name:'Hostinger',account:'https://hpanel.hostinger.com/',help:'https://support.hostinger.com/en/articles/1583249-how-to-manage-dns-records-at-hostinger'},
 {id:'bluehost',name:'Bluehost',account:'https://www.bluehost.com/my-account/login',help:'https://www.bluehost.com/help/article/dm-guide-to-the-dns-tab-in-the-account-manager'},
 {id:'porkbun',name:'Porkbun',account:'https://porkbun.com/account/login',help:'https://kb.porkbun.com/'},
 {id:'wordpress',name:'WordPress.com',account:'https://wordpress.com/domains/manage',help:'https://wordpress.com/support/domains/custom-dns/'},
 {id:'other',name:'Other provider',account:'',help:''},
];
