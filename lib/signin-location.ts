export type SignInLocation={latitude:number;longitude:number;accuracy:number;capturedAt:string;consent:true};
/** Device reports are optional/untrusted telemetry, never authorization evidence. */
export function validSignInLocation(value:unknown,at=Date.now()):SignInLocation|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 const v=value as Record<string,unknown>;
 if(v.consent!==true||typeof v.latitude!=='number'||typeof v.longitude!=='number'||typeof v.accuracy!=='number'||typeof v.capturedAt!=='string')return;
 if(!Number.isFinite(v.latitude)||Math.abs(v.latitude)>90||!Number.isFinite(v.longitude)||Math.abs(v.longitude)>180||!Number.isFinite(v.accuracy)||v.accuracy<0||v.accuracy>20000000)return;
 const time=Date.parse(v.capturedAt);if(!Number.isFinite(time)||time<at-300000||time>at+30000)return;
 return {latitude:v.latitude,longitude:v.longitude,accuracy:v.accuracy,capturedAt:new Date(time).toISOString(),consent:true};
}
