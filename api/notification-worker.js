export default async function handler(req,res){
 if(req.method!=='POST'&&req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const base=process.env.SUPABASE_URL;const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!service)return res.status(500).json({error:'Notification worker is not configured'});
 const r=await fetch(`${base}/functions/v1/process-notification-queue`,{method:'POST',headers:{Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:'{}'});
 const text=await r.text();return res.status(r.status).send(text);
}
