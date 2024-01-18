({
    doInit : function(component, event, helper) {

        var action = component.get("c.nTriggerFlowController");

        action.setParams({
            "oppId" : component.get("v.recordId")
        });

        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                // Traiter la réponse en cas de succès
            } else {
                // Traiter les erreurs
                console.error(response.getError());
            }
        });

        $A.enqueueAction(action);
    },
})
