package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object AssertSame {

  def apply[Element](message: String, transform: Element => Any = identity[Element] _): AssertSame[Element] = (elements: List[Element]) =>
    if (elements.map(transform).distinct.size == 1) ContinueProcessing(())
    else ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing $message: $elements"))

  val lastName: AssertSame[LastName] = apply[LastName](
    "last names",
    _.value.toLowerCase // some seem to be entered entirely lower case, but this isn't a significant difference, so ignore
  )

  val emailAddress: AssertSame[Option[EmailAddress]] = AssertSame[Option[EmailAddress]]("emails")

}

trait AssertSame[Element] {
  def apply(emailAddresses: List[Element]): ApiGatewayOp[Unit]
}
