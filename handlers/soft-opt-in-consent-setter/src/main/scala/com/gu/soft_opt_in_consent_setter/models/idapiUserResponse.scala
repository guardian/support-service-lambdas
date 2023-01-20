package com.gu.soft_opt_in_consent_setter.models

case class IdapiUserResponse(
    status: String,
    user: User,
)

case class User(consents: Seq[ConsentOption])

case class ConsentOption(
    id: String,
    consented: Boolean,
)
