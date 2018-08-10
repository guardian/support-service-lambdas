package com.gu.salesforce

object TypesForSFEffectsData {

  // tl:dr only put types in here if they are referenced in the SF effects test data.  They should be AnyVals.
  //
  // long version:
  //
  // types are just ways for the compiler to allow us to connect together functions and prove that the connection makes sense.
  // Therefore we only need a to use a shared type if we need to connect together two functions.
  //
  // in sf package we store some test data representing predefined Contacts and other things.  This needs to plug into
  // various effects tests that use those.  Therefore they need a shared type for the benefit of the compiler.

  case class SFContactId(value: String) extends AnyVal

}
