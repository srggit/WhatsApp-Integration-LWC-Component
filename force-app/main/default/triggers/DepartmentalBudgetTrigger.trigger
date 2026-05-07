trigger DepartmentalBudgetTrigger on Departmental_Budget__c (before insert, before update) {
    if (Trigger.isBefore && (Trigger.isInsert || Trigger.isUpdate)) {
        DepartmentalBudgetHandler.validateBudgetLimits(Trigger.new, Trigger.oldMap);
    }
}