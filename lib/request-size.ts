export class RequestSizeError extends Error { status=413; }
// Bound the bytes actually received, even without a Content-Length header.
export async function boundedBytes(request:Request,limit:number){
 if(Number(request.headers.get('content-length')??0)>limit)throw new RequestSizeError('This request is too large.');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new RequestSizeError('This request is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(size);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}return result;
}
