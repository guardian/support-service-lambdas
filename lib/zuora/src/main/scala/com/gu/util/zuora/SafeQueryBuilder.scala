package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFail, ClientFailableOp, GenericError}
import scalaz.std.list.listInstance
import scalaz.syntax.traverse.ToTraverseOps
import scalaz.{-\/, \/, \/-}

import scala.annotation.implicitNotFound

object SafeQueryBuilder {

  object Implicits {

    implicit class Query(val sc: StringContext) extends AnyVal {

      def zoql[A: Conv, B: Conv, C: Conv, D: Conv](a: A, b: B, c: C, d: D): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(conv(a), conv(b), conv(c), conv(d)))

      def zoql[A: Conv, B: Conv, C: Conv](a: A, b: B, c: C): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(conv(a), conv(b), conv(c)))

      def zoql[A: Conv, B: Conv](a: A, b: B): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(conv(a), conv(b)))

      def zoql[A: Conv](a: A): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(conv(a)))

    }

    def conv[A](a: A)(implicit convertToString: Conv[A]) = convertToString(a)

    @implicitNotFound("implicitNotFound: ZuoraQuery: can only insert a string literal or a sanitised query into a parent query")
    trait Conv[A] {
      def apply(a: A): ClientFailableOp[String]
    }

    implicit val sanitisedConv = new Conv[SanitisedQuery] {
      override def apply(sanitised: SanitisedQuery): ClientFailableOp[String] =
        \/-(sanitised.queryString) // already sanitised
    }

    implicit val failableSanitisedConv = new Conv[ClientFail \/ SanitisedQuery] {
      override def apply(failableSanitised: ClientFail \/ SanitisedQuery): ClientFailableOp[String] =
        failableSanitised match {
          case \/-(SanitisedQuery(sanitisedString)) => \/-(sanitisedString) // already sanitised
          case -\/(fail: ClientFail) => -\/(fail) // failed to sanitise the sub query
        }
    }

    implicit val stringInsertToQueryLiteral = new Conv[String] {
      override def apply(untrusted: String): ClientFailableOp[String] = {
        val sanitised = \/-(untrusted)
          .flatMap { orig =>
            if (orig.replaceAll("""\p{Cntrl}""", "") == orig)
              \/-(orig)
            else
              -\/(GenericError(s"control characters can't be inserted into a query: $orig"))
          }
          .map(_.replaceAll("""\\""", """\\\\""")
            .replaceAll("'", """\\'""")
            .replaceAll(""""""", """\\""""))
        sanitised.map(sanitised => s"'$sanitised'")
      }
    }

  }

  object OrTraverse {
    def apply[A](queries: List[A])(f: A => ClientFailableOp[SanitisedQuery]): ClientFailableOp[SanitisedQuery] = {
      queries.traverseU(f.andThen(_.map(_.queryString))).map(_.mkString(" or ")).map(new SanitisedQuery(_))
    }
  }

  object SanitisedQuery {

    def apply(hardCode: StringContext, inserts: List[ClientFailableOp[String]]): ClientFailableOp[SanitisedQuery] = {
      val maybeEscapedInserts = inserts.sequence
      maybeEscapedInserts.map { escapedInserts =>
        val rawQueryString = hardCode.s(escapedInserts.toArray: _*)
        val queryString = rawQueryString.lines.map(_.trim).filter(_ != "").mkString(" ")
        new SanitisedQuery(queryString)
      }
    }

    def unapply(arg: SanitisedQuery): Option[String] = Some(arg.queryString)
  }

  class SanitisedQuery(val queryString: String)

}
