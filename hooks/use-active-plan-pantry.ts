"use client";
import {useEffect,useState} from "react";
import {activePantryKey,recoverActivePantry,newActivePantry,editActivePantry,pantryRecoveryForStorage,type ActivePlanPantry} from "../lib/active-plan-pantry";
import {loadStoredJson,saveStoredJson,clearStoredJson} from "../lib/smart-cart-persistence";
import type {PantryEntry} from "../lib/pantry";

export function useActivePlanPantry(owner:string,enabled:boolean) {
  const [state,setState]=useState<{owner:string;record:ActivePlanPantry|null;confirmed:boolean;ready:boolean}>({owner:"",record:null,confirmed:false,ready:false});
  const [storageFailed,setStorageFailed]=useState(false);
  const owned=state.owner===owner?state:null;
  useEffect(()=>{if(enabled)setState({owner,record:recoverActivePantry(loadStoredJson(activePantryKey(owner)),owner),confirmed:false,ready:true});},[owner,enabled]);
  function store(record:ActivePlanPantry|null,confirmed:boolean){
    if(record)setStorageFailed(!saveStoredJson(activePantryKey(owner),pantryRecoveryForStorage(record)));else clearStoredJson(activePantryKey(owner));
    setState({owner,record,confirmed,ready:true});
  }
  return {
    record:owned?.record??null,confirmed:owned?.confirmed??false,ready:owned?.ready??false,storageFailed,
    start:(planId:string,at:string,entries:PantryEntry[],fresh=false)=>store(newActivePantry(owner,planId,at,entries),fresh),
    edit:(entries:PantryEntry[])=>{if(owned?.record)store(editActivePantry(owned.record,entries,new Date().toISOString()),owned.confirmed);},
    confirm:(planId:string,entries:PantryEntry[])=>{const at=new Date().toISOString();store(owned?.record&&owned.record.planId===planId?editActivePantry(owned.record,entries,at):{...newActivePantry(owner,planId,at,entries),origin:"current-reconfirmation",original:[]},true);},
    invalidate:()=>{if(owned?.record)setState({...owned,confirmed:false});},
    reset:()=>store(null,false),
  };
}
