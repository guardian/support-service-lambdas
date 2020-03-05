package com.gu.zuora

import cats.effect.IO
import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.zuora.sar.PerformSarLambdaConfig
import com.typesafe.scalalogging.LazyLogging
import io.circe.Json
import io.circe.parser.decode

import scala.util.Try

trait ZuoraService {
  def startSar(email: String,
               config: PerformSarLambdaConfig): IO[ZuoraSarResponse]
}

case class Account(accountId: String, invoices: List[String])
case class ZuoraSarResponse(accountSummary: String, accountObj: String, invoiceFiles: List[String])

object ZuoraHelper extends ZuoraService with LazyLogging {

  def getAccounts(email: String): Try[List[Account]] = ???

  def getAccountSummary(accountId: String): Try[String] = ???

  def getAccountObj(accountId: String): Try[String] = ???

  def getInvoiceFile(invoiceId: String): Try[String] = ???

  def startSar(email: String, config: PerformSarLambdaConfig): IO[ZuoraSarResponse] = {
    ???
//    for {
//      accounts <- getAccounts("www.test.com")
//      account <- accounts
//      summary <- getAccountSummary(account.accountId)
//      accountObj <- getAccountObj(account.accountId)
//      invoices = account.invoices
//    } yield {
//      val invoiceFiles = invoices.map(getInvoiceFile).sequence
//      invoiceFiles.map { invoiceContents =>
//        ZuoraSarResponse(summary, accountObj, invoiceContents)
//      }
//    }
  }
}
