import { LightningElement, api } from 'lwc';
import triggerFlows from '@salesforce/apex/OpportunityFlowTriggerController.triggerFlows';

export default class OpportunityFlowTrigger extends LightningElement {
    @api recordId; // This gets the ID of the current Opportunity record.

    handleClick() {
        triggerFlows({ opportunityId: this.recordId })
            .then(() => {
                // Handle success
                console.log('Flows triggered successfully.');
                // You might want to display a success message or refresh the page
            })
            .catch(error => {
                // Handle the error
                console.error('Error in triggering flows:', error);
                // You might want to display an error message
            });
    }
}