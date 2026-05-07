public class DepartmentalBudgetHandler {
    public static void validateBudgetLimits(List<Departmental_Budget__c> newList, Map<Id, Departmental_Budget__c> oldMap) {
        Set<Id> yearlyBudgetIds = new Set<Id>();
        Set<Id> parentDeptBudgetIds = new Set<Id>();

        for (Departmental_Budget__c db : newList) {
            if (db.Yearly_Budget__c != null) {
                yearlyBudgetIds.add(db.Yearly_Budget__c);
            }
            if (db.Parent_Departmental_Budget__c != null) {
                parentDeptBudgetIds.add(db.Parent_Departmental_Budget__c);
            }
        }

        // Query Yearly Budgets
        Map<Id, Yearly_Budget__c> yearlyBudgets = new Map<Id, Yearly_Budget__c>(
            [SELECT Id, Budget_Amount__c FROM Yearly_Budget__c WHERE Id IN :yearlyBudgetIds]
        );

        // Aggregate Department Budgets by Yearly Budget (excluding rejected)
        Map<Id, Decimal> yearlyBudgetTotals = new Map<Id, Decimal>();
        if (!yearlyBudgetIds.isEmpty()) {
            for (AggregateResult ar : [
                SELECT Yearly_Budget__c yb, SUM(Department_Budget_Amount__c) total
                FROM Departmental_Budget__c
                WHERE Yearly_Budget__c IN :yearlyBudgetIds 
                      AND Id NOT IN :newList 
                      AND Status__c != 'Rejected'
                GROUP BY Yearly_Budget__c
            ]) {
                yearlyBudgetTotals.put((Id)ar.get('yb'), (Decimal)ar.get('total'));
            }
        }

        // Aggregate Department Budgets by parent (self-lookup) (excluding rejected)
        Map<Id, Decimal> parentBudgetTotals = new Map<Id, Decimal>();
        if (!parentDeptBudgetIds.isEmpty()) {
            for (AggregateResult ar : [
                SELECT Parent_Departmental_Budget__c parent, SUM(Department_Budget_Amount__c) total
                FROM Departmental_Budget__c
                WHERE Parent_Departmental_Budget__c IN :parentDeptBudgetIds 
                      AND Id NOT IN :newList 
                      AND Status__c != 'Rejected'
                GROUP BY Parent_Departmental_Budget__c
            ]) {
                parentBudgetTotals.put((Id)ar.get('parent'), (Decimal)ar.get('total'));
            }
        }

        // Query parent departmental budget records (excluding rejected)
        Map<Id, Departmental_Budget__c> parentBudgets = new Map<Id, Departmental_Budget__c>(
            [SELECT Id, Department_Budget_Amount__c 
             FROM Departmental_Budget__c 
             WHERE Id IN :parentDeptBudgetIds 
               AND Status__c != 'Rejected']
        );

        // Final Validation Loop
        for (Departmental_Budget__c db : newList) {
            Decimal currentValue = db.Department_Budget_Amount__c == null ? 0 : db.Department_Budget_Amount__c;

            // Validation for Yearly Budget
            if (db.Yearly_Budget__c != null && yearlyBudgets.containsKey(db.Yearly_Budget__c)) {
                Decimal existing = yearlyBudgetTotals.get(db.Yearly_Budget__c) != null ? yearlyBudgetTotals.get(db.Yearly_Budget__c) : 0;
                Decimal yearlyBudgetLimit = yearlyBudgets.get(db.Yearly_Budget__c).Budget_Amount__c;

                if (existing + currentValue > yearlyBudgetLimit) {
                    db.addError('Total Departmental Budget exceeds the Yearly Budget Amount.');
                }
            }

            // Validation for Parent Departmental Budget
            if (db.Parent_Departmental_Budget__c != null && parentBudgets.containsKey(db.Parent_Departmental_Budget__c)) {
                Decimal existing = parentBudgetTotals.get(db.Parent_Departmental_Budget__c) != null ? parentBudgetTotals.get(db.Parent_Departmental_Budget__c) : 0;
                Decimal parentLimit = parentBudgets.get(db.Parent_Departmental_Budget__c).Department_Budget_Amount__c;

                if (existing + currentValue > parentLimit) {
                    db.addError('Total Departmental Budget exceeds the Parent Departmental Budget Amount.');
                }
            }
        }
    }
}