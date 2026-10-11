import Editor from '@/app/editor';
export default async function EditorPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Editor siteId={id}/>;}
