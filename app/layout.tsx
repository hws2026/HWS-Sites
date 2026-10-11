import type {Metadata} from 'next';
import './globals.css';
import './commerce.css';
import './website-fonts.css';
import './website-design.css';
import './website-fidelity.css';
import './finalsite-composition.css';
import './website-modules.css';
export const metadata:Metadata={title:'HWS Studio — Website Editor',description:'Build and publish your website with a visual drag-and-drop editor.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
