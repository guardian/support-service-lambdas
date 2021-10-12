package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types.IsDigitalVoucherUser
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.LazyClientFailableOp

object ValidateNoLosingDigitalVoucher {

  def apply(losingContacts: List[LazyClientFailableOp[IsDigitalVoucherUser]]): ApiGatewayOp[Unit] =
    losingContacts.to(LazyList).map {
      _.value.toApiGatewayOp("get SF address").flatMap {
        case IsDigitalVoucherUser(true) => ReturnWithResponse(ApiGatewayResponse.notFound(
          "one of the losing contacts is in the digital vouchers and would be broken"
        ))
        case IsDigitalVoucherUser(false) => ContinueProcessing(())
      }
    }.find(_.isComplete).getOrElse(ContinueProcessing(()))

}
