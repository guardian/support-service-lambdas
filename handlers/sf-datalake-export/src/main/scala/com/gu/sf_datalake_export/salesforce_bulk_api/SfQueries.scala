package com.gu.sf_datalake_export.salesforce_bulk_api

object BulkApiParams {

  case class Soql(value: String) extends AnyVal

  case class ObjectName(value: String) extends AnyVal

  case class SfObjectName(value: String) extends AnyVal

  case class BatchSize(value: Int) extends AnyVal

  val maxBatchSize = BatchSize(250000)
  val minBatchSize = BatchSize(100000)

  case class SfQueryInfo(soql: Soql, objectName: ObjectName, sfObjectName: SfObjectName, batchSize: Option[BatchSize] = Some(maxBatchSize))

  val contact = SfQueryInfo(Soql(SfQueries.contactQuery), ObjectName("Contact"), SfObjectName("Contact"))
  val subscription = SfQueryInfo(Soql(SfQueries.subscriptionsQuery), ObjectName("Subscription"), SfObjectName("SF_Subscription__c"))
  val account = SfQueryInfo(Soql(SfQueries.accounts), ObjectName("Account"), SfObjectName("Account"))
  val cancellationSurvey = SfQueryInfo(Soql(SfQueries.cancellationSurvey), ObjectName("CancellationSurvey"), SfObjectName("Cancellation_Survey_Voluntary__c"))
  val cardExpiry = SfQueryInfo(Soql(SfQueries.cardExpiry), ObjectName("CardExpiry"), SfObjectName("Card_Expiry__c"))
  val cases = SfQueryInfo(Soql(SfQueries.cases), ObjectName("Case"), SfObjectName("Case"))
  val caseComment = SfQueryInfo(Soql(SfQueries.caseComment), ObjectName("CaseComment"), SfObjectName("CaseComment"))
  val csSurvey = SfQueryInfo(Soql(SfQueries.csSurvey), ObjectName("CsSurvey"), SfObjectName("CS_Survey__c"))
  val discount = SfQueryInfo(Soql(SfQueries.discount), ObjectName("Discount"), SfObjectName("Discount__c"))
  val fulfilmentProcessInformation = SfQueryInfo(Soql(SfQueries.fulfilmentProcessInformation), ObjectName("FulfilmentProcessInformation"), SfObjectName("Fulfilment_Process_Information__c"))
  val imovoContract = SfQueryInfo(Soql(SfQueries.imovoContract), ObjectName("ImovoContract"), SfObjectName("Imovo_Contract__c"))
  val paymentCard = SfQueryInfo(Soql(SfQueries.paymentCard), ObjectName("PaymentCard"), SfObjectName("Payment_Card__c"))
  val paymentFailure = SfQueryInfo(Soql(SfQueries.paymentFailure), ObjectName("PaymentFailure"), SfObjectName("Payment_Failure__c"))

  val all = List(
    contact,
    subscription,
    account,
    cancellationSurvey,
    cardExpiry,
    cases,
    caseComment,
    csSurvey,
    discount,
    fulfilmentProcessInformation,
    imovoContract,
    paymentCard,
    paymentFailure
  )

  val byName = all.map(obj => obj.objectName -> obj).toMap

  def findByName(stringName: String): Option[SfQueryInfo] = byName.get(ObjectName(stringName))
}

object SfQueries {
  val contactQuery =
    """select
      |AccountId,
      |OtherCity,
      |OtherCountry,
      |OtherState,
      |OtherStreet,
      |OtherPostalCode,
      |Phone,
      |CEX_Surveys_Opt_Out__c,
      |Company_Name__c,
      |CreatedDate,
      |Email,
      |FirstName,
      |Full_contact_Id__c,
      |IdentityID__c,
      |MailingCity,
      |MailingCountry,
      |MailingState,
      |MailingStreet,
      |MailingPostalCode,
      |Salutation,
      |tp_Contact_Type__c,
      |LastName,
      |Digital_Voucher_User__c,
      |Voucher_Fulfilment_Cut_Off_Date__c,
      |Voucher_Start_Date__c
      |from Contact
      |where
      |Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  val subscriptionsQuery =
    """
      |select
      |AcquisitionCase__c,
      |Acquisition_Date__c,
      |Acquisition_Source__c,
      |Autopay__c,
      |Autorenew__c,
      |Bill_Cycle_Day__c,
      |Zuora_Billing_account__c,
      |Buyer__c,
      |Promo_Campaign__c,
      |Cancellation_Effective_Date__c,
      |Cancellation_Reason__c,
      |Cancellation_Request_Date__c,
      |Cancellation_Source__c,
      |Cancellation_Survey_Voluntary__c,
      |Cancelled_At__c,
      |Cancelled_By__c,
      |Case_Number__c,
      |Promotion_Channel__c,
      |Promotion_Code__c,
      |Currency__c,
      |Default_Payment_Method__c,
      |Default_Payment_Method_Type__c,
      |Promo_Description__c,
      |Digi_Print__c,
      |Promotion_Discount_Duration__c,
      |First_Invoice__c,
      |First_Invoice_Date__c,
      |Fulfilment_Start_Date__c,
      |Last_Invoice__c,
      |Last_Invoice_Date__c,
      |Next_Charge_Date__c,
      |Payment_Failure_Record__c,
      |Payment_Term__c,
      |Product__c,
      |Product_Name__c,
      |Product_Type__c,
      |Promotion_Code_Lookup__c,
      |Promotion_Discount__c,
      |Quoted_Refund_Amount__c,
      |Rate_Plan_Name__c,
      |Reason_for_Cancellation__c,
      |Recipient__c,
      |RecordTypeId,
      |SF_Status__c,
      |Name,
      |Status__c,
      |Sub_Reason__c,
      |Survey_Sent__c,
      |Term_End_Date__c,
      |Term_Start_Date__c,
      |Promo_Type__c,
      |Version__c,
      |Zuora_Id__c
      |from SF_Subscription__c
      |where Buyer__r.Account.GDPR_Deletion_Pending__c = false
      |
  """.stripMargin

  //TODO BillingAccount__c doesn't exist ?
  val accounts =
    """
    select
   |Description,
   |Fax,
   |Id,
   |Name,
   |Phone,
   |Type,
   |Zuora__Active__c,
   |BillingCity,
   |BillingCountry,
   |BillingGeocodeAccuracy,
   |BillingLatitude,
   |BillingLongitude,
   |BillingState,
   |BillingStreet,
   |BillingPostalCode,
   |CreatedById,
   |CreatedDate,
   |Zuora__CustomerPriority__c,
   |IsDeleted,
   |NumberOfEmployees,
   |Industry,
   |JigsawCompanyId,
   |LastActivityDate,
   |LastModifiedById,
   |LastModifiedDate,
   |LastReferencedDate,
   |LastViewedDate,
   |MasterRecordId,
   |Zuora__NumberofLocations__c,
   |OwnerId,
   |ParentId,
   |Person_Contact__c,
   |PhotoUrl,
   |RecordTypeId,
   |ShippingCity,
   |ShippingCountry,
   |ShippingGeocodeAccuracy,
   |ShippingLatitude,
   |ShippingLongitude,
   |ShippingState,
   |ShippingStreet,
   |ShippingPostalCode,
   |Zuora__SLA__c,
   |Zuora__SLAExpirationDate__c,
   |Zuora__SLASerialNumber__c,
   |SYS_LastName__c,
   |SYS_Auto_Created__c,
   |SYS_FirstName__c,
   |SystemModstamp,
   |Zuora__UpsellOpportunity__c,
   |Website
   |from
   |Account
   |where
   |GDPR_Deletion_Pending__c = false
    """.stripMargin

  val cancellationSurvey =
    """
      |select
      |Contact__c,
      |CreatedById,
      |CreatedDate,
      |IsDeleted,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |OwnerId,
      |Q1_Reason_for_Joining__c,
      |Q2_Reason_for_Cancelling__c,
      |Q3_Cancellation_Reason_Elaborate__c,
      |Q4_Future_Improvements__c,
      |Id,
      |RecordTypeId,
      |SF_Subscription__c,
      |Survey_Completed__c,
      |Survey_Sent__c,
      |SystemModstamp
      |from
      |Cancellation_Survey_Voluntary__c
      |where Contact__r.Account.GDPR_Deletion_Pending__c = false
      |
    """.stripMargin

  val cardExpiry =
    """
      |select
      |Acquisition_Date__c,
      |Billing_Account__c,
      |Billing_Account_Zuora_Id__c,
      |Buyer_Email__c,
      |Cancellation_Effective_Date__c,
      |Cancellation_Request_Date__c,
      |Initial_Card_Expiry_Month__c,
      |Latest_Card_Expiry_Month__c,
      |Name,
      |Initial_Card_Expiry_Year__c,
      |Latest_Card_Expiry_Year__c,
      |Contact__c,
      |CreatedById,
      |CreatedDate,
      |Initial_Date_Payment_Method_Created__c,
      |Latest_Date_Payment_Method_Created__c,
      |Initial_Days_Since_Creation__c,
      |IsDeleted,
      |Initial_Last_4_Digits__c,
      |Latest_Last_4_Digits__c,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |Latest_Payment_Method__c,
      |Next_Charge_Date__c,
      |Outcome__c,
      |Initial_Payment_Method__c,
      |Initial_Payment_Method_Created_By__c,
      |Latest_Payment_Method_Created_By__c,
      |Initial_Payment_Method_Name__c,
      |Latest_Payment_Method_Name__c,
      |Payment_Term__c,
      |Product_Name__c,
      |Product_Type__c,
      |Promotion_Code__c,
      |Rate_Plan_Name__c,
      |Id,
      |SF_Subscription__c,
      |Status__c,
      |Subscription_Name__c,
      |SystemModstamp,
      |Term_End_Date__c
      |from
      |Card_Expiry__c
      |where Contact__r.Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  val cases =
    """
      |select
      |AccountId,
      |Acquisition_Subscription__c,
      |Bank_Code__c,
      |Bank_Transfer_Account_Name__c,
      |Bank_Transfer_Account_Number__c,
      |Enquiry_Type__c,
      |Id,
      |CaseNumber,
      |Origin,
      |Reason,
      |Case_Closure_Reason__c,
      |Type,
      |Journey__c,
      |CEX_Survey_URL__c,
      |IsClosed,
      |Closed_By__c,
      |ClosedDate,
      |SuppliedCompany,
      |ContactEmail,
      |ContactFax,
      |ContactId,
      |ContactMobile,
      |ContactPhone,
      |Contacts_Most_Recent_Case__c,
      |Contract_Acceptance_Date__c,
      |CreatedById,
      |CreatedDate,
      |Date_of_Issue__c,
      |IsDeleted,
      |Description,
      |SuppliedEmail,
      |ENT_TECH_Assignee__c,
      |Comments,
      |Issue_Occurred_Today__c,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |Membership_Tier__c,
      |MRR__c,
      |SuppliedName,
      |OwnerId,
      |ParentId,
      |Payment_Method_Type__c,
      |SuppliedPhone,
      |Product__c,
      |Subscription__c,
      |Subscription_Name__c,
      |Retention_Policy_Invoked__c,
      |SF_Subscription__c,
      |SourceId,
      |Status,
      |Subject,
      |Related_Subscription__c,
      |Survey_Sent__c,
      |SystemModstamp,
      |WinBack_Email__c
      |from
      |Case
      |where Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  val caseComment =
    """
      |select
      |CommentBody,
      |Id,
      |CreatedById,
      |CreatedDate,
      |IsDeleted,
      |LastModifiedById,
      |LastModifiedDate,
      |ParentId,
      |IsPublished,
      |SystemModstamp
      |from
      |CaseComment
      |where Parent.Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  //Date_Submitted__c, doesnt seem to exist
  val csSurvey =
    """select
      |Case_Contact_Email__c,
      |Name,
      |CreatedById,
      |CreatedDate,
      |IsDeleted,
      |LastActivityDate,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |OwnerId,
      |Q1_Customer_Satisfaction__c,
      |Q2_Agent_Effort__c,
      |Q3_Transactional_NPS__c,
      |Q4_Free_Text_Field__c,
      |Id,
      |Related_to_Case__c,
      |Related_to_Contact__c,
      |SystemModstamp
      |from
      |CS_Survey__c
      |where Related_to_Contact__r.Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  val discount =
    """
      |select
      |Case_Number__c,
      |Contact__c,
      |Contact_Name__c,
      |CreatedById,
      |CreatedDate,
      |CSR__c,
      |IsDeleted,
      |Name,
      |Duration__c,
      |Effective_End_Date__c,
      |Effective_Start_Date__c,
      |Estimated_Forecasted_Discount_Value__c,
      |LastActivityDate,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |OwnerId,
      |Percentage_Applied__c,
      |Product__c,
      |Id,
      |SF_Subscription__c,
      |Status__c,
      |SystemModstamp
      |from
      |Discount__c
      |where Contact__r.Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  val fulfilmentProcessInformation =
    """
      |select
      |Billing_Account__c,
      |Contact__c,
      |Contract_Acceptance_Date__c,
      |CreatedById,
      |CreatedDate,
      |IsDeleted,
      |Name,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |Last_Voucher_Fulfilment_Process__c,
      |Next_Voucher_Fulfilment_Process__c,
      |OwnerId,
      |Product_Summary__c,
      |Rate_Plan_Name__c,
      |Id,
      |Subscription_End_Date__c,
      |Subscription_Name__c,
      |Subscription_Start_Date__c,
      |SystemModstamp
      |from
      |Fulfilment_Process_Information__c
      |where Contact__r.Account.GDPR_Deletion_Pending__c =false
    """.stripMargin

  //the object Imovo_Contract__c doesn't seem to exist
  val imovoContract =
    """
      |select
      |Card__c,
      |Contact__c,
      |CreatedById,
      |CreatedDate,
      |IsDeleted,
      |End_Date__c,
      |Name,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |Letter__c,
      |OwnerId,
      |Previous_Card__c,
      |Previous_Letter__c,
      |Id,
      |Replacement_Requested_Date__c,
      |Start_Date__c,
      |Status__c,
      |SystemModstamp
      |from
      |Imovo_Contract__c
      |where Contact__r.Account.GDPR_Deletion_Pending__c = false
    """.stripMargin

  val paymentCard =
    """
      |select
      |AccountID__c,
      |Zuora_BillingAccount__c,
      |cc_brand__c,
      |cc_reference__c,
      |cc_source_country__c,
      |CreatedById,
      |CreatedDate,
      |Date_time__c,
      |IsDeleted,
      |exp_month__c,
      |exp_year__c,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |last4__c,
      |OwnerId,
      |Name,
      |payment_ref__c,
      |Id,
      |SystemModstamp,
      |Zuora_AccountingCode__c,
      |Zuora_GatewayResponse__c,
      |Zuora_GatewayResponseCode__c,
      |Zuora_Invoice__c,
      |Zuora_ReferenceId__c
      |from
      |Payment_Card__c
      |where AccountID__r.GDPR_Deletion_Pending__c = false
    """.stripMargin

  //Last_Attempt_Error_Code__c doesnt seem to exist
  val paymentFailure =
    """
      |select
      |Initial_Accounting_Code__c,
      |Latest_Accounting_Code__c,
      |Auto_Pay__c,
      |Billing_Account__c,
      |Billing_Account_Zuora_Id__c,
      |Contact__c,
      |Current_Card_Expiry_Month__c,
      |Current_Card_Expiry_Year__c,
      |Contact_Email__c,
      |CreatedById,
      |CreatedDate,
      |Currency__c,
      |Current_Date_Payment_Method_Created__c,
      |Current_Days_Since_Creation__c,
      |Days_Since_Creation__c,
      |IsDeleted,
      |Initial_Gateway_Response_Code__c,
      |Latest_Gateway_Response_Code__c,
      |Initial_Gateway_State__c,
      |Latest_Gateway_State__c,
      |Initial_Payment__c,
      |Invoice__c,
      |Invoice_Balance__c,
      |Invoice_Created_Date__c,
      |Invoice_Number__c,
      |Invoice_Payment_at_Time_of_Failure__c,
      |Invoice_Total_Amount__c,
      |Current_Last_4_Digits__c,
      |LastActivityDate,
      |Last_Attempt_Date__c,
      |Last_Attempt_Type__c,
      |LastModifiedById,
      |LastModifiedDate,
      |LastReferencedDate,
      |LastViewedDate,
      |LatestPayment__c,
      |Number_of_Failures__c,
      |Number_of_Payments__c,
      |Outcome__c,
      |Initial_Payment_Created_Date__c,
      |Latest_Payment_Created_Date__c,
      |Name,
      |Payment_Failure_Type__c,
      |Current_Payment_Method__c,
      |Initial_Payment_Method__c,
      |Latest_Payment_Method__c,
      |Current_Payment_Method_Created_By__c,
      |Current_Payment_Method_Name__c,
      |Initial_Payment_Number__c,
      |Latest_Payment_Number__c,
      |Initial_Payment_Status__c,
      |Latest_Payment_Status__c,
      |Initial_Payment_Type__c,
      |Latest_Payment_Type__c,
      |Id,
      |Recovery_Method__c,
      |SF_Subscription__c,
      |Subscription_Name__c,
      |SystemModstamp
      |from
      |Payment_Failure__c
      |where Contact__r.Account.GDPR_Deletion_Pending__c = false
    """.stripMargin
}
