public with sharing class ApprovalController {
    @AuraEnabled
    public static String submitForApproval(Id recordId) {
        try {
            Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
            req.setComments('Submitted via LWC');
            req.setObjectId(recordId);
            req.setSubmitterId(UserInfo.getUserId());

            Approval.ProcessResult result = Approval.process(req);

            if (result.isSuccess()) {
                return 'Approval submitted successfully!';
            } else {
                return 'Approval submission failed.';
            }
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
}