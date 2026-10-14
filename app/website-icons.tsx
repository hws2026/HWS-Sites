import {BookOpen,GraduationCap,School,Library,Pencil,Palette,Music,Trophy,CalendarDays,Clock,Users,HeartHandshake,Heart,Accessibility,Globe,Handshake,Bus,Utensils,Briefcase,ShieldCheck,Stethoscope,Laptop,CreditCard,Building,Phone,Mail,MapPin,Megaphone,FileText,ClipboardList,Download,Newspaper,House,Search,Link,Star} from 'lucide-react';
import {isIconName,suggestedIcon,type IconName} from '@/lib/icon-catalog';

const icons:Record<IconName,typeof BookOpen>={
 'book-open':BookOpen,'graduation-cap':GraduationCap,school:School,library:Library,pencil:Pencil,palette:Palette,music:Music,trophy:Trophy,
 calendar:CalendarDays,clock:Clock,users:Users,'heart-handshake':HeartHandshake,heart:Heart,accessibility:Accessibility,globe:Globe,handshake:Handshake,
 bus:Bus,utensils:Utensils,briefcase:Briefcase,'shield-check':ShieldCheck,stethoscope:Stethoscope,laptop:Laptop,'credit-card':CreditCard,building:Building,
 phone:Phone,mail:Mail,'map-pin':MapPin,megaphone:Megaphone,'file-text':FileText,'clipboard-list':ClipboardList,download:Download,newspaper:Newspaper,
 house:House,search:Search,link:Link,star:Star,
};
export function WebsiteIcon({name,title='',size=32}:{name?:IconName;title?:string;size?:number}){
 const key=isIconName(name)?name:suggestedIcon(title);const Icon=icons[key];
 return <Icon data-icon={key} size={size} strokeWidth={1.5} aria-hidden="true"/>;
}
