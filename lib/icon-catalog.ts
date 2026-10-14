// Persist stable names rather than SVG markup or library component names.
export const iconCatalog = [
 {id:'book-open',label:'Book',keywords:'education reading library'},
 {id:'graduation-cap',label:'Graduation',keywords:'education school admissions enroll'},
 {id:'school',label:'School',keywords:'education campus building'},
 {id:'library',label:'Library',keywords:'education books reading'},
 {id:'pencil',label:'Pencil',keywords:'education writing edit'},
 {id:'palette',label:'Art',keywords:'education painting creative'},
 {id:'music',label:'Music',keywords:'education arts band'},
 {id:'trophy',label:'Trophy',keywords:'education sports athletics awards'},
 {id:'calendar',label:'Calendar',keywords:'events date schedule'},
 {id:'clock',label:'Clock',keywords:'events hours time schedule'},
 {id:'users',label:'People',keywords:'community families parents team'},
 {id:'heart-handshake',label:'Support',keywords:'community help assistance care'},
 {id:'heart',label:'Heart',keywords:'community health wellness giving donation'},
 {id:'accessibility',label:'Accessibility',keywords:'community disability access inclusion'},
 {id:'globe',label:'Globe',keywords:'community world language international'},
 {id:'handshake',label:'Partnership',keywords:'community business volunteer'},
 {id:'bus',label:'Bus',keywords:'services transportation travel'},
 {id:'utensils',label:'Dining',keywords:'services cafeteria food lunch menu'},
 {id:'briefcase',label:'Careers',keywords:'services jobs employment work'},
 {id:'shield-check',label:'Safety',keywords:'services police security protection'},
 {id:'stethoscope',label:'Health',keywords:'services nurse medical clinic'},
 {id:'laptop',label:'Technology',keywords:'services computer device support'},
 {id:'credit-card',label:'Payments',keywords:'services fees billing finance'},
 {id:'building',label:'Building',keywords:'services office district government'},
 {id:'phone',label:'Phone',keywords:'contact call telephone'},
 {id:'mail',label:'Email',keywords:'contact message newsletter'},
 {id:'map-pin',label:'Location',keywords:'contact address directions map'},
 {id:'megaphone',label:'Announcement',keywords:'contact news updates alert'},
 {id:'file-text',label:'Document',keywords:'resources forms policies file'},
 {id:'clipboard-list',label:'Checklist',keywords:'resources tasks forms registration'},
 {id:'download',label:'Download',keywords:'resources file save'},
 {id:'newspaper',label:'News',keywords:'resources stories updates press'},
 {id:'house',label:'Home',keywords:'navigation house homepage'},
 {id:'search',label:'Search',keywords:'navigation find lookup'},
 {id:'link',label:'Link',keywords:'navigation website shortcut'},
 {id:'star',label:'Star',keywords:'navigation featured favorite highlights'},
] as const;
export type IconName = typeof iconCatalog[number]['id'];
export function isIconName(value:unknown):value is IconName {
 return typeof value==='string'&&iconCatalog.some(icon=>icon.id===value);
}
export function suggestedIcon(title:string):IconName {
 if(/calendar|schedule|event/i.test(title))return 'calendar';
 if(/food|menu|lunch/i.test(title))return 'utensils';
 if(/bus|transport/i.test(title))return 'bus';
 if(/career|employment/i.test(title))return 'briefcase';
 if(/contact/i.test(title))return 'phone';
 if(/polic|safety/i.test(title))return 'shield-check';
 if(/assistance|support/i.test(title))return 'heart-handshake';
 if(/family|families|community/i.test(title))return 'users';
 if(/enroll|admission|school/i.test(title))return 'graduation-cap';
 if(/form|document/i.test(title))return 'file-text';
 return 'book-open';
}
