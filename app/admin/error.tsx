"use client";

export default function AdminError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="admin-access"><div className="admin-access-card"><span className="admin-kicker">VANTA / ADMIN</span><h1>Workspace error.</h1><p>{error.message||"The admin page could not be loaded."}</p><button className="admin-button" onClick={()=>reset()}>Try again</button></div></div>;}

