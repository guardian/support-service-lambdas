package com.gu.salesforce.sttp

import io.circe.Encoder

case class SFApiCompositePart[PART_BODY: Encoder](
    referenceId: String,
    method: String,
    url: String,
    body: PART_BODY,
)

case class SFApiCompositeRequest[PART_BODY: Encoder](
    allOrNone: Boolean,
    collateSubrequests: Boolean,
    compositeRequest: List[SFApiCompositePart[PART_BODY]],
)

case class SFApiCompositeResponsePart(
    //  body: Option[???],
    httpStatusCode: Int,
    referenceId: String,
)

case class SFApiCompositeResponse(
    compositeResponse: List[SFApiCompositeResponsePart],
)
