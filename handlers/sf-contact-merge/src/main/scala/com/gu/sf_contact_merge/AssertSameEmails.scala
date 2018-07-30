package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.GetEmails.EmailAddress
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object AssertSameEmails {

  def apply(emailAddresses: List[Option[EmailAddress]]): ApiGatewayOp[Unit] =
    if (emailAddresses.distinct.size == 1) ContinueProcessing(())
    else ReturnWithResponse(ApiGatewayResponse.notFound("those zuora accounts had differing emails"))

}
