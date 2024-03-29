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

  /** The table `supporter_revenue_engine.identity_product_retention` is generated by a dbt model which runs daily to
    * bring together different types of paying relationship.
    *
    * https://github.com/guardian/data-platform-models/blob/10479a7290cc6803f3ffdc47341cc97f50bae68b/dbt/models/supporter_revenue_engine/identity_product_retention.sql
    *
    * @param identityId
    * @return
    */
  def productHoldingsQuery(identityId: IdentityId): String = {
    s"""SELECT 
      |  identity_id
      |  , ongoing_relationship
      |  , effective_lapsed_date
      |FROM supporter_revenue_engine.identity_product_retention
      |WHERE identity_id = '${identityId.value}'
      |""".stripMargin
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
