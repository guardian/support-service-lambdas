package com.gu.identityRetention

import com.google.cloud.bigquery.{FieldValue, FieldValueList, TableResult}
import com.gu.google.BigQueryHelper
import com.gu.identityRetention.Types.{IdentityId, ProductHolding}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.Json

import scala.jdk.CollectionConverters._
import java.time.LocalDate

object GetActiveProductHoldings extends LazyLogging {

  case class IdentityQueryResponse(Id: String) extends Product
  implicit val reads = Json.reads[IdentityQueryResponse]

  def apply(bigQueryHelper: BigQueryHelper)(identityId: IdentityId): ApiGatewayOp[List[ProductHolding]] = {

    val productsToIgnore = List("Friend")
    val productsToIgnoreSql = productsToIgnore.map(toSqlString).mkString(",")

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
    val query =
      s"""WITH holdings AS (
         |  SELECT 
         |    identity_id
         |    , reader_revenue_product AS product
         |    , holding_product_status AS status
         |    , COALESCE(churn_date, DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR)) AS effective_lapsed_date -- WRONG, just stops it being NULL
         |  FROM `reader_revenue.fact_holding_snapshot_day_current`
         |)
         |
         |SELECT *
         |  , DATE_ADD(effective_lapsed_date, INTERVAL 7 YEAR) AS effective_deletion_date 
         |FROM holdings
         |WHERE identity_id = '${identityId.value}'
         |  AND product NOT IN ($productsToIgnoreSql)
         |""".stripMargin

    logger.debug(s"querying active product holdings: $query")

    val result = bigQueryHelper.runQuery(query) match {
      case Left(error) =>
        Left(ApiGatewayResponse.internalServerError(error.toString))
      case Right(results) =>
        Right(getProductHoldingResults(results))
    }

    result.toApiGatewayOp
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
      row.get("product").getStringValue,
      row.get("status").getStringValue,
      getDateValue(row.get("effective_lapsed_date")),
      getDateValue(row.get("effective_deletion_date")),
    )
    logger.debug(holding.toString)
    holding
  }

  def getDateValue(fieldValue: FieldValue): LocalDate = {
    LocalDate.parse(fieldValue.getStringValue)
  }

  def toSqlString(value: String) = s"'${value.replace("'", "''")}'"
}
