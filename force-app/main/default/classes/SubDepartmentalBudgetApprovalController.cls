public with sharing class SubDepartmentalBudgetApprovalController {
    
    @AuraEnabled(cacheable=true)
    public static List<ApprovalRequestWrapper> getPendingApprovalRequestsWithProposals(String parentBudgetId) {
        List<ApprovalRequestWrapper> approvalRequests = new List<ApprovalRequestWrapper>();
        
        try {
            System.debug('parentBudgetId received: ' + parentBudgetId);
            
            if (String.isBlank(parentBudgetId)) {
                System.debug('parentBudgetId is blank, returning empty list');
                return approvalRequests; 
            }
            
            // Get budget IDs and names first
            List<Departmental_Budget__c> budgets = [
                SELECT Id, Name, Department_Budget_Amount__c, Budget_Objective__c,
                    Department__c, Department__r.Name, Department__r.User__r.Name,
                    Yearly_Budget__c, Yearly_Budget__r.Name, Utilized_Budget__c, Utilized__c
                FROM Departmental_Budget__c 
                WHERE Parent_Departmental_Budget__c = :parentBudgetId
            ];
            
            System.debug('Found ' + budgets.size() + ' sub-departmental budgets');
            
            if (budgets.isEmpty()) {
                return approvalRequests;
            }
            
            Set<Id> budgetIds = new Set<Id>();
            Map<Id, Departmental_Budget__c> budgetIdToRecordMap = new Map<Id, Departmental_Budget__c>();
            for(Departmental_Budget__c budget : budgets) {
                budgetIds.add(budget.Id);
                budgetIdToRecordMap.put(budget.Id, budget);
            }
            
            // Get proposals for these budgets
            Map<Id, List<Proposal__c>> budgetIdToProposalsMap = new Map<Id, List<Proposal__c>>();
            List<Proposal__c> proposals = [
                SELECT Id, Name, Budget__c, Expected_Revenue__c, Tentative_Date__c, Expected_Outcome__c,
                    Team_Member__c, Team_Member__r.Name, Departmental_Budget__c
                FROM Proposal__c 
                WHERE Departmental_Budget__c IN :budgetIds
                ORDER BY Name
            ];
            
            for(Proposal__c proposal : proposals) {
                if (!budgetIdToProposalsMap.containsKey(proposal.Departmental_Budget__c)) {
                    budgetIdToProposalsMap.put(proposal.Departmental_Budget__c, new List<Proposal__c>());
                }
                budgetIdToProposalsMap.get(proposal.Departmental_Budget__c).add(proposal);
            }
            
            // Get pending approval requests
            List<ProcessInstanceWorkitem> workItems = [
                SELECT Id, ProcessInstanceId, ActorId, Actor.Name,
                    ProcessInstance.Id, ProcessInstance.TargetObjectId, 
                    ProcessInstance.Status, ProcessInstance.CreatedDate, 
                    ProcessInstance.CreatedBy.Name
                FROM ProcessInstanceWorkitem 
                WHERE ProcessInstanceId IN (
                    SELECT Id FROM ProcessInstance 
                    WHERE TargetObjectId IN :budgetIds 
                    AND Status = 'Pending'
                )
            ];
            
            System.debug('Found ' + workItems.size() + ' pending workitems');
            
            // Create wrapper objects with proposals
            for (ProcessInstanceWorkitem workItem : workItems) {
                Id targetBudgetId = workItem.ProcessInstance.TargetObjectId;
                if (budgetIdToRecordMap.containsKey(targetBudgetId)) {
                    Departmental_Budget__c budget = budgetIdToRecordMap.get(targetBudgetId);
                    
                    ApprovalRequestWrapper wrapper = new ApprovalRequestWrapper();
                    wrapper.workitemId = workItem.Id;
                    wrapper.processInstanceId = workItem.ProcessInstanceId;
                    wrapper.budgetId = budget.Id;
                    wrapper.budgetName = budget.Name;
                    wrapper.budgetAmount = budget.Department_Budget_Amount__c != null ? budget.Department_Budget_Amount__c : 0;
                    wrapper.utilizedBudget = budget.Utilized_Budget__c != null ? budget.Utilized_Budget__c : 0;
                    wrapper.utilizedPercentage = budget.Utilized__c != null ? budget.Utilized__c : 0;
                    wrapper.budgetObjective = budget.Budget_Objective__c != null ? budget.Budget_Objective__c : '';
                    wrapper.departmentName = budget.Department__r?.Name != null ? budget.Department__r.Name : '';
                    wrapper.departmentHead = budget.Department__r?.User__r?.Name != null ? budget.Department__r.User__r.Name : '';
                    wrapper.yearlyBudgetName = budget.Yearly_Budget__r?.Name != null ? budget.Yearly_Budget__r.Name : '';
                    wrapper.submittedBy = workItem.ProcessInstance.CreatedBy.Name;
                    wrapper.submittedDate = workItem.ProcessInstance.CreatedDate;
                    wrapper.currentApprover = workItem.Actor.Name;
                    
                    // Format the amounts
                    wrapper.formattedBudgetAmount = formatBudgetAmount(wrapper.budgetAmount);
                    wrapper.formattedUtilizedBudget = formatBudgetAmount(wrapper.utilizedBudget);
                    wrapper.formattedUtilizedPercentage = wrapper.utilizedPercentage + '%';
                    
                    // Add proposals
                    wrapper.proposals = budgetIdToProposalsMap.get(targetBudgetId);
                    if (wrapper.proposals == null) {
                        wrapper.proposals = new List<Proposal__c>();
                    }
                    
                    approvalRequests.add(wrapper);
                }
            }
            
            System.debug('Total approval requests created: ' + approvalRequests.size());
            
        } catch (Exception e) {
            System.debug('Error in getPendingApprovalRequestsWithProposals: ' + e.getMessage());
            System.debug('Stack trace: ' + e.getStackTraceString());
            throw new AuraHandledException('Error fetching approval requests with proposals: ' + e.getMessage());
        }
        
        return approvalRequests;
    }

    
    // Helper method to format budget amounts
    private static String formatBudgetAmount(Decimal amount) {
        if (amount == null || amount == 0) {
            return '0';
        }
        
        // Convert to crores if amount is >= 10,000,000
        if (amount >= 10000000) {
            Decimal crores = amount / 10000000;
            return String.valueOf(crores.setScale(1)) + 'Cr';
        }
        // Convert to lakhs if amount is >= 100,000
        else if (amount >= 100000) {
            Decimal lakhs = amount / 100000;
            return String.valueOf(lakhs.setScale(1)) + 'L';
        }
        // Convert to thousands if amount is >= 1,000
        else if (amount >= 1000) {
            Decimal thousands = amount / 1000;
            return String.valueOf(thousands.setScale(1)) + 'K';
        }
        // Return as is for smaller amounts
        return String.valueOf(amount.setScale(0));
    }
    
    // Additional debug method to check data independently
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> debugApprovalData(String parentBudgetId) {
        Map<String, Object> debugInfo = new Map<String, Object>();
        
        try {
            // Check sub-departmental budgets
            List<Departmental_Budget__c> subBudgets = [
                SELECT Id, Name, Parent_Departmental_Budget__c 
                FROM Departmental_Budget__c 
                WHERE Parent_Departmental_Budget__c = :parentBudgetId
            ];
            debugInfo.put('subBudgetsCount', subBudgets.size());
            debugInfo.put('subBudgets', subBudgets);
            
            if (!subBudgets.isEmpty()) {
                Set<Id> budgetIds = new Set<Id>();
                for(Departmental_Budget__c budget : subBudgets) {
                    budgetIds.add(budget.Id);
                }
                
                // Check all process instances
                List<ProcessInstance> allProcesses = [
                    SELECT Id, TargetObjectId, Status, CreatedDate, CreatedBy.Name
                    FROM ProcessInstance 
                    WHERE TargetObjectId IN :budgetIds
                ];
                debugInfo.put('allProcessesCount', allProcesses.size());
                debugInfo.put('allProcesses', allProcesses);
                
                // Check pending process instances
                List<ProcessInstance> pendingProcesses = [
                    SELECT Id, TargetObjectId, Status, CreatedDate, CreatedBy.Name
                    FROM ProcessInstance 
                    WHERE TargetObjectId IN :budgetIds 
                    AND Status = 'Pending'
                ];
                debugInfo.put('pendingProcessesCount', pendingProcesses.size());
                debugInfo.put('pendingProcesses', pendingProcesses);
                
                // Check workitems using the working query approach
                List<ProcessInstanceWorkitem> workitems = [
                    SELECT Id, ProcessInstanceId, ActorId, Actor.Name,
                           ProcessInstance.TargetObjectId
                    FROM ProcessInstanceWorkitem
                    WHERE ProcessInstanceId IN (
                        SELECT Id FROM ProcessInstance 
                        WHERE TargetObjectId IN :budgetIds 
                        AND Status = 'Pending'
                    )
                ];
                debugInfo.put('workitemsCount', workitems.size());
                debugInfo.put('workitems', workitems);
            }
            
        } catch (Exception e) {
            debugInfo.put('error', e.getMessage());
        }
        
        return debugInfo;
    }
    
    @AuraEnabled
    public static String processApproval(String workitemId, String action, String comments) {
        try {
            // Validate inputs
            if (String.isBlank(workitemId)) {
                throw new AuraHandledException('Workitem ID is required.');
            }
            
            if (action != 'Approve' && action != 'Reject') {
                throw new AuraHandledException('Invalid action. Use Approve or Reject.');
            }
            
            // Process the approval
            Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
            req.setWorkitemId(workitemId);
            req.setAction(action);
            req.setComments(comments != null ? comments : '');
            
            Approval.ProcessResult result = Approval.process(req);
            
            if (result.isSuccess()) {
                return 'Success: Request ' + action.toLowerCase() + 'd successfully.';
            } else {
                String errorMsg = 'Error processing approval: ';
                for (Database.Error error : result.getErrors()) {
                    errorMsg += error.getMessage() + ' ';
                }
                throw new AuraHandledException(errorMsg);
            }
            
        } catch (Exception e) {
            System.debug('Error in processApproval: ' + e.getMessage());
            throw new AuraHandledException('Error processing approval: ' + e.getMessage());
        }
    }
    
    // Wrapper class for approval request data
    public class ApprovalRequestWrapper {
    @AuraEnabled public String workitemId;
    @AuraEnabled public String processInstanceId;
    @AuraEnabled public String budgetId;
    @AuraEnabled public String budgetName;
    @AuraEnabled public Decimal budgetAmount;
    @AuraEnabled public Decimal utilizedBudget;
    @AuraEnabled public Decimal utilizedPercentage;
    @AuraEnabled public String budgetObjective;
    @AuraEnabled public String departmentName;
    @AuraEnabled public String departmentHead;
    @AuraEnabled public String yearlyBudgetName;
    @AuraEnabled public String submittedBy;
    @AuraEnabled public DateTime submittedDate;
    @AuraEnabled public String currentApprover;
    
    // Formatted amount fields
    @AuraEnabled public String formattedBudgetAmount;
    @AuraEnabled public String formattedUtilizedBudget;
    @AuraEnabled public String formattedUtilizedPercentage;
    
    // NEW: Proposals field
    @AuraEnabled public List<Proposal__c> proposals;
}
}