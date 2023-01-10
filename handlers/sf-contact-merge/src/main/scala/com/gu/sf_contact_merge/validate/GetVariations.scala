package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.sf_contact_merge.validate.GetVariations.Variations

object GetVariations {

  sealed trait Variations[+Element]
  case class HasNoVariations[Element](canonical: Element) extends Variations[Element]
  case class Differing[Element](variants: List[Element]) extends Variations[Element]
  case class HasAllowableVariations[Element](canonical: Element) extends Variations[Element]

  def apply[Element](message: String, transform: Element => Element): GetVariations[Element] =
    (elements: List[Element]) => {
      val originalVariations = elements.distinct
      val normalisedVariations = originalVariations.map(transform).distinct
      (originalVariations, normalisedVariations) match {
        case (a :: Nil, unique :: Nil) => HasNoVariations(unique)
        case (_, unique :: Nil) => HasAllowableVariations(unique)
        case (orig, _) => Differing(orig)
      }
    }

  val forLastName: GetVariations[LastName] = apply[LastName](
    "last names",
    lastName => LastName(lastName.value.toLowerCase.filter(_.isLetterOrDigit)),
    // some seem to be entered entirely lower case, and have trailing punctuation, but these aren't significant differences, so ignore
  )

  val forEmailAddress: GetVariations[EmailAddress] = GetVariations[EmailAddress](
    "emails",
    emailAddress => EmailAddress(emailAddress.value.replaceFirst("""\+gnm[0-9]?@""", "@")),
    // lowercasing is handled when it's constructed, as it's a fundamental thing (in our world) rather than just our interpretation
  )

}

trait GetVariations[Element] {
  def apply(emailAddresses: List[Element]): Variations[Element]
}
