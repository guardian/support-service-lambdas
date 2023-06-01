package com.gu.identityRetention

import com.google.cloud.bigquery.{FieldValue, FieldValueList, TableResult}
import com.gu.google.BigQueryHelper
import com.gu.identityRetention.Types.{IdentityId, ProductHolding}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.typesafe.scalalogging.LazyLogging

import scala.jdk.CollectionConverters._
import java.time.LocalDate

object GetActiveProductHoldings extends LazyLogging {

  def apply(bigQueryHelper: BigQueryHelper)(identityId: IdentityId): ApiGatewayOp[List[ProductHolding]] = {

    val query: String = productHoldingsQuery(identityId)

    logger.debug(s"querying active product holdings: $query")

    val result = bigQueryHelper.runQuery(query) match {
      case Left(error) =>
        Left(ApiGatewayResponse.internalServerError(error.toString))
      case Right(results) =>
        Right(getProductHoldingResults(results))
    }

    result.toApiGatewayOp
  }

  def productHoldingsQuery(identityId: IdentityId): String = {
    /*
     TODO: we have a few options for putting together the different data sources we require:
      1) write a large query here that interrogates multiple tables, UNION's the results and applies the
         deletion date logic.
          PROS: We keep all the code and SQL and business logic in one place
          CONS: Potentially BQ service account will need broad access
                No detection of changes that would break the queries until the lambda fails
      2) write minimal SQL to get the sources into case classes and apply business logic in Scala
          PROS: Scala programmers like scala code
          CONS: Potentially BQ service account will need broad access
                No detection of changes that would break the queries until the lambda fails
      3) write the large query as a SQL view or table (using dbt) that UNION's the sources and applies the
         deletion date logic.
          PROS: simplifies access permissions for the service account
                breaking changes to the data sources will be picked up when dbt runs
          CONS: splits part of the implementation into the datalake
      Or other combinations...
     */
    val zuoraHoldings =
      s"""
         |  SELECT 
         |    acc.identity_id_c AS identity_id 
         |    , 'Zuora' AS product
         |    -- statuses: Draft, Pending Acceptance, Cancelled, Expired, Active
         |    , CASE sub.status 
         |        WHEN 'Active' THEN true
         |        WHEN 'Cancelled' THEN false
         |        WHEN 'Expired' THEN false
         |        ELSE NULL
         |      END AS ongoing_relationship
         |    , sub.term_end_date AS effective_lapsed_date
         |    , DATE_ADD(sub.term_end_date, INTERVAL 7 YEAR) AS effective_deletion_date
         |  FROM `datatech-fivetran.zuora.account` acc
         |  INNER JOIN `datatech-fivetran.zuora.subscription` sub
         |  ON sub.account_id = acc.id
         |  WHERE identity_id_c = '${identityId.value}'
         |  AND acc.status != 'Canceled' 
         |  AND (acc.processing_advice_c IS NULL OR acc.processing_advice_c != 'DoNotProcess')
         |""".stripMargin

    def patronHoldings(suffix: String) = // AUS: suffix='_au'; ROW: suffix=''
      s"""
         |  SELECT 
         |    identity.id AS identity_id
         |    , 'Patron' AS product
         |    -- statuses: active, incomplete, null (one_off), canceled, past_due, incomplete_expired
         |    , CASE 
         |        WHEN sub.status = 'active' THEN true
         |        WHEN sub.status IS NULL THEN false -- one-off payment
         |        WHEN sub.status IN ('canceled', 'past_due') THEN false
         |        ELSE NULL
         |      END AS ongoing_relationship
         |    , CASE
         |        WHEN sub.status IS NULL THEN DATE_ADD(CAST(chg.created AS DATE), INTERVAL 1 YEAR) -- one-off payment
         |        ELSE CAST(sub.current_period_end AS DATE) 
         |      END AS effective_lapsed_date
         |    , CASE
         |        WHEN sub.status IS NULL THEN DATE_ADD(CAST(chg.created AS DATE), INTERVAL 8 YEAR) -- one-off payment
         |        ELSE DATE_ADD(CAST(sub.current_period_end AS DATE), INTERVAL 7 YEAR)
         |      END AS effective_deletion_date
         |  FROM `datalake.identity` identity
         |  INNER JOIN `datatech-fivetran.stripe_patrons${suffix}_prod.customer` cust
         |  ON cust.email = identity.primary_email_address
         |  INNER JOIN `datatech-fivetran.stripe_patrons${suffix}_prod.charge` chg
         |  ON chg.customer_id = cust.id
         |  LEFT JOIN `datatech-fivetran.stripe_patrons${suffix}_prod.subscription_history` sub
         |  ON sub.customer_id = cust.id AND sub.latest_invoice_id = chg.invoice_id
         |  WHERE identity.id = '${identityId.value}'
         |""".stripMargin

    val eventbriteHoldings =
      s"""
         |  SELECT 
         |    identity_id
         |    , o.event_type AS product
         |    -- statuses: completed, draft, canceled, live, started
         |    , CASE 
         |        WHEN e.status IN ('live', 'started') THEN true
         |        WHEN e.status IN ('canceled', 'completed') THEN false
         |        ELSE NULL
         |      END AS ongoing_relationship
         |    , CAST(e.start_utc AS DATE) AS effective_lapsed_date
         |    , DATE_ADD(CAST(e.start_utc AS DATE), INTERVAL 7 YEAR) AS effective_deletion_date
         |  FROM datalake.eventbrite_orders o
         |  INNER JOIN datalake.eventbrite_events e
         |  USING (event_id)
         |  WHERE identity_id = '${identityId.value}'
         |""".stripMargin

    val mobileSubHoldings =
      s"""
         |  SELECT
         |      user_id AS identity_id
         |      , product_id AS product
         |      , CASE 
         |          WHEN cancellation_timestamp IS NOT NULL THEN false
         |          WHEN end_timestamp < CURRENT_TIMESTAMP THEN false
         |          ELSE true 
         |        END AS ongoing_relationship
         |      , CAST(end_timestamp AS DATE) AS effective_lapsed_date
         |      , DATE_ADD(CAST(end_timestamp AS DATE), INTERVAL 7 YEAR) AS effective_deletion_date
         |  FROM datalake.mobile_user_subscription
         |  INNER JOIN datalake.mobile_subscriptions
         |  USING (subscription_id)      
         |  WHERE user_id = '${identityId.value}'
         |""".stripMargin

    val contributionHoldings =
      s"""
         |  SELECT 
         |    identity_id
         |    , 'Single contribution' AS product
         |    -- status: Failed, Paid, Refunded
         |    , CASE status
         |        WHEN 'Paid' THEN FALSE
         |        ELSE NULL
         |      END AS ongoing_relationship
         |    , DATE_ADD(CAST(received_timestamp AS DATE), INTERVAL 372 DAY) AS effective_lapsed_date -- 1y, 1wk
         |    , DATE_ADD(CAST(received_timestamp AS DATE), INTERVAL 2562 DAY) AS effective_deletion_date -- 8y, 1wk
         |  FROM `datatech-fivetran.contributions_prod_public.contributions`
         |  WHERE identity_id = '${identityId.value}'
         |""".stripMargin

    val subQueries = List(
      zuoraHoldings,
      patronHoldings(""),
      patronHoldings("_au"),
      eventbriteHoldings,
      mobileSubHoldings,
      contributionHoldings,
    )

    val query = subQueries.mkString("\nUNION ALL\n")
    query
  }

  def getProductHoldingResults(queryResult: TableResult): List[ProductHolding] = {
    logger.debug(s"queryResult rows: ${queryResult.getTotalRows}")
    queryResult
      .iterateAll()
      .asScala
      .map(toProductHolding)
      .toList
  }

  def toProductHolding(row: FieldValueList): ProductHolding = {
    val holding = ProductHolding(
      row.get("identity_id").getStringValue,
      row.get("ongoing_relationship").getBooleanValue,
      getDateValue(row.get("effective_lapsed_date")),
    )
    logger.debug(holding.toString)
    holding
  }

  def getDateValue(fieldValue: FieldValue): LocalDate = {
    LocalDate.parse(fieldValue.getStringValue)
  }
}
