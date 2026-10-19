export const cookingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type CookingDay = typeof cookingDays[number];

export function normalizeCookingDay(value: unknown): CookingDay | undefined {
  return cookingDays.includes(value as CookingDay) ? value as CookingDay : undefined;
}

export function setCookingDay<T extends { day: string; name: string }>(meal: T, value: unknown): T & { scheduledDay?: CookingDay } {
  return { ...meal, scheduledDay: normalizeCookingDay(value) };
}

export function sortScheduledMeals<T extends { scheduledDay?: string }>(meals: T[]): T[] {
  const rank = (meal: T) => { const day = normalizeCookingDay(meal.scheduledDay); return day ? cookingDays.indexOf(day) : 7; };
  return [...meals].sort((a, b) => rank(a) - rank(b));
}

export type ScheduledMeal={day:string;name:string;scheduledDay?:string;dbId?:number|string;user_id?:string};
export function scheduleIdentity(meal:ScheduledMeal){return JSON.stringify([meal.user_id??"",meal.day,meal.name]);}
export function isDinnerSchedule(meal:ScheduledMeal){return !/^(breakfast|lunch|sweet treat)/i.test(meal.day);}
export function dinnerDayOccupancy(meals:ScheduledMeal[],excluding?:ScheduledMeal){return cookingDays.map(day=>({day,meals:meals.filter(m=>isDinnerSchedule(m)&&m.scheduledDay===day&&(!excluding||scheduleIdentity(m)!==scheduleIdentity(excluding)))}));}
export function assignCookingDay<T extends ScheduledMeal>(meals:T[],meal:T,day:CookingDay|undefined,mode:"move"|"swap"="move"):{ok:true;meals:T[]}|{ok:false;message:string}{
 const id=scheduleIdentity(meal),existing=meals.find(m=>scheduleIdentity(m)===id),sourceDay=normalizeCookingDay(existing?.scheduledDay);
 const occupants=day&&isDinnerSchedule(meal)?meals.filter(m=>isDinnerSchedule(m)&&m.scheduledDay===day&&scheduleIdentity(m)!==id):[];
 if(occupants.length&&(mode!=="swap"||occupants.length!==1))return {ok:false,message:occupants.length>1?"This day has existing overlapping dinners. Move one to a free day before swapping.":`${day} already has ${occupants[0].name}. Choose a free day or explicitly swap.`};
 if(occupants.length&&sourceDay&&meals.some(m=>isDinnerSchedule(m)&&m.scheduledDay===sourceDay&&scheduleIdentity(m)!==id))return {ok:false,message:"The original day has overlapping dinners. Resolve that assignment before swapping."};
 const next=meals.map(m=>scheduleIdentity(m)===id?setCookingDay(m,day):occupants.length&&scheduleIdentity(m)===scheduleIdentity(occupants[0])?setCookingDay(m,sourceDay):m);
 return {ok:true,meals:existing?next:[...next,setCookingDay(meal,day)]};
}

// Filter on render as well as resetting on auth changes, so a previous owner's
// lineup cannot appear during the render before the reset effect runs.
export function mealsForOwner<T extends {user_id?:string}>(meals:T[],owner:string):T[]{
 return meals.filter(meal=>(meal.user_id??"")===owner);
}

export function bindNewMealOwner<T extends {user_id?:string}>(meal:T,owner:string):(T&{user_id:string})|null{
 return meal.user_id&&meal.user_id!==owner?null:{...meal,user_id:owner};
}

// Use the latest saved assignment, including changes made while replacement was
// pending. Recipe fields come from the replacement; do not retain stale steps.
export function replaceScheduledRecipe<T extends ScheduledMeal>(current:T,replacement:T):T{
 if(current.user_id!==replacement.user_id||current.day!==replacement.day)return current;
 return {...replacement,scheduledDay:current.scheduledDay};
}
