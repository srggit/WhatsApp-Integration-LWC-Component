public with sharing class DepartmentalBudgetChartController {

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getDepartments(String yearlyBudgetId) {
        List<Departmental_Budget__c> budgets = [
            SELECT Id, Department__r.Name
            FROM Departmental_Budget__c
            WHERE Yearly_Budget__c = :yearlyBudgetId
              AND Parent_Departmental_Budget__c = NULL
        ];

        List<Map<String, String>> options = new List<Map<String, String>>();
        for (Departmental_Budget__c db : budgets) {
            options.add(new Map<String, String>{
                'id' => db.Id,
                'name' => db.Department__r != null ? db.Department__r.Name : db.Name
            });
        }
        return options;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getSubDepartmentBudgetsWithProposalCount(String parentBudgetId) {
        // Get all sub-departments regardless of utilized budget
        List<Departmental_Budget__c> subBudgets = [
            SELECT Id, Name, Department__r.Name, Department_Budget_Amount__c, 
                   Utilized_Budget__c, (SELECT Id FROM Proposals__r)
            FROM Departmental_Budget__c
            WHERE Parent_Departmental_Budget__c = :parentBudgetId
            ORDER BY Department__r.Name NULLS LAST
        ];

        List<Map<String, Object>> result = new List<Map<String, Object>>();
        for (Departmental_Budget__c b : subBudgets) {
            result.add(new Map<String, Object>{
                'label' => b.Department__r != null ? b.Department__r.Name : b.Name,
                'utilized' => b.Utilized_Budget__c != null ? b.Utilized_Budget__c : 0,
                'proposals' => b.Proposals__r != null ? b.Proposals__r.size() : 0,
                'totalBudget' => b.Department_Budget_Amount__c != null ? b.Department_Budget_Amount__c : 0
            });
        }
        return result;
    }
}