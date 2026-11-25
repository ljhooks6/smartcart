export function pantryMealMetadata(value:unknown){
  const v=(value&&typeof value==="object"?value:{}) as Record<string,unknown>;
  return {
    pantryOnly:typeof v.pantryOnly==="boolean"?v.pantryOnly:undefined,
    pantryPlanId:typeof v.pantryPlanId==="string"&&v.pantryPlanId.length<=180?v.pantryPlanId:undefined,
    pantrySnapshotAt:typeof v.pantrySnapshotAt==="string"&&Number.isFinite(Date.parse(v.pantrySnapshotAt))?v.pantrySnapshotAt:undefined,
    pantryTimeLimit:typeof v.pantryTimeLimit==="number"&&Number.isInteger(v.pantryTimeLimit)&&v.pantryTimeLimit>0&&v.pantryTimeLimit<=240?v.pantryTimeLimit:undefined,
  };
}
