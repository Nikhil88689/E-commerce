"use client";

import { useState } from "react";
import { ContentManager } from "@/components/admin/management";

export function ContentTabs({stories,drops,sections}:{stories:Record<string,unknown>[];drops:Record<string,unknown>[];sections:Record<string,unknown>[]}){
  const [tab,setTab]=useState<"stories"|"drops"|"homepage">("stories");
  return <><div className="admin-subtabs" role="tablist" aria-label="Editorial content"><button role="tab" aria-selected={tab==="stories"} className={`admin-subtab ${tab==="stories"?"active":""}`} onClick={()=>setTab("stories")}>Stories · {stories.length}</button><button role="tab" aria-selected={tab==="drops"} className={`admin-subtab ${tab==="drops"?"active":""}`} onClick={()=>setTab("drops")}>Product drops · {drops.length}</button><button role="tab" aria-selected={tab==="homepage"} className={`admin-subtab ${tab==="homepage"?"active":""}`} onClick={()=>setTab("homepage")}>Homepage sections · {sections.length}</button></div><ContentManager key={tab} kind={tab} initial={tab==="stories"?stories:tab==="drops"?drops:sections}/></>;
}

