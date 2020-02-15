package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.Types._
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import cats.implicits._
import cats.data._

object GetZuoraAccountsForEmail {

  case class WireResponseContact(Id: String)
  implicit val readsC = Json.reads[WireResponseContact]

  case class WireResponseAccount(
    Id: String,
    IdentityId__c: Option[String],
    sfContactId__c: String,
    CrmId: String
  )
  implicit val readsA = Json.reads[WireResponseAccount]

  def apply(zuoraQuerier: ZuoraQuerier)(emailAddress: EmailAddress): ClientFailableOp[List[ZuoraAccountIdentitySFContact]] = {

    findZuoraContacts(zuoraQuerier, emailAddress)
      .flatMap { list: List[WireResponseContact] =>
        list.flatTraverse { (contactWithEmail: WireResponseContact) =>
          val accountsM: ClientFailableOp[List[WireResponseAccount]] = findZuoraAccounts(zuoraQuerier, contactWithEmail)
          val sfContactsM: ClientFailableOp[List[ZuoraAccountIdentitySFContact]] = accountsM.flatMap { accounts: List[WireResponseAccount] =>
            accounts.traverse { accountsWithEmail: WireResponseAccount =>
              clientFailableOpM.pure(ZuoraAccountIdentitySFContact(AccountId(accountsWithEmail.Id), accountsWithEmail.IdentityId__c.map(IdentityId.apply), SFContactId(accountsWithEmail.sfContactId__c), CrmId(accountsWithEmail.CrmId)))
            }
          }
          accountsM.map { accounts: List[WireResponseAccount] =>
            val tmp: List[ZuoraAccountIdentitySFContact] = accounts.map(accountsWithEmail => ZuoraAccountIdentitySFContact(AccountId(accountsWithEmail.Id), accountsWithEmail.IdentityId__c.map(IdentityId.apply), SFContactId(accountsWithEmail.sfContactId__c), CrmId(accountsWithEmail.CrmId)))
            tmp.head
          }
          sfContactsM
        }
      }

    //    findZuoraContacts(zuoraQuerier, emailAddress)
    //      .flatMap { list: List[WireResponseContact] =>
    //        list.traverse { (contactWithEmail: WireResponseContact) =>
    //          (findZuoraAccounts(zuoraQuerier, contactWithEmail))
    //            .map(_.map((accountsWithEmail: WireResponseAccount) => ZuoraAccountIdentitySFContact(
    //              AccountId(accountsWithEmail.Id),
    //              accountsWithEmail.IdentityId__c.map(IdentityId.apply),
    //              SFContactId(accountsWithEmail.sfContactId__c),
    //              CrmId(accountsWithEmail.CrmId)
    //            )).flatten)
    //        }
    //      }

    //    val accounts = for {
    //      contactWithEmail <- findZuoraContacts(zuoraQuerier, emailAddress)
    //      accountsWithEmail <- findZuoraAccounts(zuoraQuerier, contactWithEmail)
    //    } yield ZuoraAccountIdentitySFContact(
    //      AccountId(accountsWithEmail.Id),
    //      accountsWithEmail.IdentityId__c.map(IdentityId.apply),
    //      SFContactId(accountsWithEmail.sfContactId__c),
    //      CrmId(accountsWithEmail.CrmId)
    //    )
    //
    //    accounts.run
  }

  private def findZuoraAccounts(zuoraQuerier: ZuoraQuerier, contactWithEmail: WireResponseContact): ClientFailableOp[List[WireResponseAccount]] = {
    for {
      accountQuery <- zoql"SELECT Id, IdentityId__c, sfContactId__c, CrmId FROM Account where BillToId=${contactWithEmail.Id}"
      queryResult <- zuoraQuerier[WireResponseAccount](accountQuery).map(_.records)
    } yield queryResult
  }

  private def findZuoraContacts(zuoraQuerier: ZuoraQuerier, emailAddress: EmailAddress): ClientFailableOp[List[WireResponseContact]] = {
    for {
      contactQuery <- zoql"SELECT Id FROM Contact where WorkEmail=${emailAddress.value}"
      queryResult <- zuoraQuerier[WireResponseContact](contactQuery).map(_.records)
    } yield queryResult
  }
}
