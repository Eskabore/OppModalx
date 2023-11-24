import { LightningElement, api, wire, track } from "lwc";
import { getRecord, createRecord, updateRecord, getFieldValue, getRecordNotifyChange } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import PRICE_DETAILS_OBJECT from "@salesforce/schema/Price_Details__c";
import OPPORTUNITY_AMOUNT_FIELD from "@salesforce/schema/Opportunity.Amount";
import REDUCTION_FIELD from "@salesforce/schema/Price_Details__c.Rabat_Percentage__c";
import NETTO_PREIS_FIELD from "@salesforce/schema/Price_Details__c.Netto_Preis__c";
import OPPORTUNITY_NAME_FIELD from "@salesforce/schema/Opportunity.Opportunity_Name_del__c";
import OPPORTUNITY_BRUTTO_PRICE_FIELD from "@salesforce/schema/Price_Details__c.Opportunity_Brutto_Price__c";
import PRICE_DETAILS_CREATED_FIELD from '@salesforce/schema/Opportunity.Price_Details_Created__c';

export default class OppModalx extends LightningElement {
  @track isModalOpen = false;
  @track reduction;
  @track nettoPreis;
  @track isRabattaktion = false; // Tracks the state of the checkbox
  @api recordId;
  @track opportunityName; // Track the Opportunity Name for display
  @track opportunityAmount; // Assume this is set from the wired Opportunity data
  @track umsatzsteuer = 0.19; // Umsatzsteuer (19% VAT)
  @track reductionPercentage; // User input for discount percentage
  @track priceDetailsCreated = false;

  // Use getRecord to wire the Opportunity record and its fields
  @wire(getRecord, {
    recordId: "$recordId",
    fields: [OPPORTUNITY_NAME_FIELD, OPPORTUNITY_AMOUNT_FIELD, PRICE_DETAILS_CREATED_FIELD],
  })
  wiredOpportunity({ error, data }) {
    if (data) {
      this.opportunityName = getFieldValue(data, OPPORTUNITY_NAME_FIELD);
      this.opportunityAmount = getFieldValue(data, OPPORTUNITY_AMOUNT_FIELD);
      this.priceDetailsCreated = getFieldValue(data, PRICE_DETAILS_CREATED_FIELD);
      console.log('priceDetailsCreated:', this.priceDetailsCreated);
    } else if (error) {
      // Handle the error gracefully
      console.error("Error retrieving Opportunity data", error);
    }
  }

  get showPriceDetailsButton() {
    return !this.priceDetailsCreated;
}

  // Calculate Netto Preis on form load or whenever necessary
  calculateNettoPreis() {
    if (this.opportunityAmount) {
      // Calculate Netto Preis based on Opportunity amount and Umsatzsteuer
      this.nettoPreis = this.opportunityAmount * (1 + this.umsatzsteuer);
    }
  }

  // Call this method when the form is being opened or when the Opportunity amount changes
  openModal() {
    this.calculateNettoPreis();
    this.isModalOpen = true;
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  handleChange(event) {
    const field = event.target.name;
    if (field === "reduction") {
      this.reduction = event.target.value;
    } else if (field === "nettoPreis") {
      this.nettoPreis = event.target.value;
    }
    // Handle changes for other fields similarly
  }

  // Handler for Rabatt in Prozent change
  handleReductionPercentageChange(event) {
    this.reductionPercentage = event.target.value;
  }

  handleReductionChange(event) {
    this.reduction = event.target.value;
  }

  // Handler for the Rabattaktion checkbox change
  handleRabattaktionChange(event) {
    this.isRabattaktion = event.target.checked;
  }

  handleNettoPreisChange(event) {
    this.nettoPreis = event.target.value;
  }

  saveDetails() {
    const fields = {};
    fields[REDUCTION_FIELD.fieldApiName] = this.reduction;

    // Calculate nettoPreis based on Opportunity amount and Umsatzsteuer (19%)
    const umsatzsteuerAmount = this.opportunityAmount * this.umsatzsteuer;
    this.nettoPreis = this.opportunityAmount + umsatzsteuerAmount;


      // Check if the Rabattaktion checkbox is selected
      if (this.isRabattaktion) {
        // Apply a 15% discount
        const discount = this.nettoPreis * 0.15;
        // Calculate 5% of the discount as Rohertrags Neutral
        const rohertragsNeutral = this.nettoPreis * 0.05;
        // Calculate 10% of the discount from Rohertrag
        const rohertragDiscount = this.nettoPreis * 0.1;

        // Update the net price after discount
        this.nettoPreis -= discount;

        // Assign these calculated values to the fields on your "Price Details" record
        // Replace the following field API names with the actual API names in your schema
        fields["Discount__c"] = discount;
        fields["RohertragsNeutral__c"] = rohertragsNeutral;
        fields["RohertragDiscount__c"] = rohertragDiscount;

      } else if (this.opportunityAmount) {
        // Calculate nettoPreis based on Opportunity amount and Umsatzsteuer (19%)
        this.nettoPreis = this.opportunityAmount * 1.19;
      }

      // Set the final nettoPreis
      fields[NETTO_PREIS_FIELD.fieldApiName] = this.nettoPreis;

    const recordInput = { apiName: PRICE_DETAILS_OBJECT.objectApiName, fields };

    // Create the Price Details record
    createRecord(recordInput)
      .then((priceDetail) => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Record created successfully!",
            variant: "success",
          })
        );
        this.updateOpportunity();
        this.closeModal();
      })
      .catch((error) => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error creating record",
            message: error.body.message,
            variant: "error",
            mode: "sticky", // Makes the toast remain on the screen until the user dismisses it
          })
        );
      });
  }

  updateOpportunity() {
    // Construct the fields object for the Opportunity record update
    const fields = {};
    fields[PRICE_DETAILS_CREATED_FIELD.fieldApiName] = true;
    fields['Id'] = this.recordId; // Use the Opportunity's record ID

    // Update the Opportunity record
    const oppRecordInput = { fields }; // apiName is not needed since Id is provided
    updateRecord(oppRecordInput)
        .then(() => {
            // Show a toast message indicating the update was successful
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Opportunity updated successfully.',
                    variant: 'success'
                })
            );
            // Call this after updating the Opportunity record to refresh the record page cache
            getRecordNotifyChange([{recordId: this.recordId}]);
        })
        .catch((error) => {
            // Show a toast message indicating the update failed
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating Opportunity',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        });
}
  }


