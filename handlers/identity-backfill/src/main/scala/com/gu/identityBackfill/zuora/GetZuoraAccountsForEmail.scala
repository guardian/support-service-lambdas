package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.Types._
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import cats.syntax.all._

object GetZuoraAccountsForEmail {

  case class WireResponseContact(Id: String)
  implicit val readsC = Json.reads[WireResponseContact]

  case class WireResponseAccount(
      Id: String,
      IdentityId__c: Option[String],
      sfContactId__c: String,
      CrmId: String,
  )
  implicit val readsA = Json.reads[WireResponseAccount]

  // cats does not have ListT so after removing scalaz it became flatMap + traverse
  def apply(
      zuoraQuerier: ZuoraQuerier,
  )(emailAddress: EmailAddress): ClientFailableOp[List[ZuoraAccountIdentitySFContact]] = {
    findZuoraContacts(zuoraQuerier, emailAddress).flatMap {
      _.flatTraverse { contactWithEmail =>
        findZuoraAccounts(zuoraQuerier, contactWithEmail).map {
          _.map { accountsWithEmail =>
            ZuoraAccountIdentitySFContact(
              AccountId(accountsWithEmail.Id),
              accountsWithEmail.IdentityId__c.map(IdentityId.apply),
              SFContactId(accountsWithEmail.sfContactId__c),
              CrmId(accountsWithEmail.CrmId),
            )
          }
        }
      }
    }
  }

  private def findZuoraAccounts(
      zuoraQuerier: ZuoraQuerier,
      contactWithEmail: WireResponseContact,
  ): ClientFailableOp[List[WireResponseAccount]] = {
    for {
      accountQuery <-
        zoql"SELECT Id, IdentityId__c, sfContactId__c, CrmId FROM Account where BillToId=${contactWithEmail.Id}"
      queryResult <- zuoraQuerier[WireResponseAccount](accountQuery).map(_.records)
    } yield queryResult
  }

  private def findZuoraContacts(
      zuoraQuerier: ZuoraQuerier,
      emailAddress: EmailAddress,
  ): ClientFailableOp[List[WireResponseContact]] = {
    for {
      contactQuery <- zoql"SELECT Id FROM Contact where WorkEmail=${emailAddress.value}"
      queryResult <- zuoraQuerier[WireResponseContact](contactQuery).map(_.records)
    } yield queryResult
  }
}
