package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFail, ClientFailableOp, GenericError}
import scalaz.std.list.listInstance
import scalaz.syntax.traverse.ToTraverseOps
import scalaz.{-\/, \/, \/-}

import scala.annotation.implicitNotFound

object SafeQueryBuilder {

  object Implicits {

    implicit class Query(val sc: StringContext) extends AnyVal {

      // only went up to 4 at the moment, might need more

      def zoql[A: MakeSafe, B: MakeSafe, C: MakeSafe, D: MakeSafe](a: A, b: B, c: C, d: D): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(asSafe(a), asSafe(b), asSafe(c), asSafe(d)))

      def zoql[A: MakeSafe, B: MakeSafe, C: MakeSafe](a: A, b: B, c: C): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(asSafe(a), asSafe(b), asSafe(c)))

      def zoql[A: MakeSafe, B: MakeSafe](a: A, b: B): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(asSafe(a), asSafe(b)))

      def zoql[A: MakeSafe](a: A): ClientFailableOp[SanitisedQuery] =
        SanitisedQuery(hardCode = sc, inserts = List(asSafe(a)))

    }

    def asSafe[A](a: A)(implicit makeSafe: MakeSafe[A]) = makeSafe(a)

    @implicitNotFound("implicitNotFound: ZuoraQuery: can only insert a string literal or a sanitised query into a parent query")
    trait MakeSafe[A] {
      def apply(a: A): ClientFailableOp[String]
    }

    implicit val sanitisedConv = new MakeSafe[SanitisedQuery] {
      override def apply(sanitised: SanitisedQuery): ClientFailableOp[String] =
        \/-(sanitised.queryString) // already sanitised
    }

    implicit val failableSanitisedConv = new MakeSafe[ClientFail \/ SanitisedQuery] {
      override def apply(failableSanitised: ClientFail \/ SanitisedQuery): ClientFailableOp[String] =
        failableSanitised.map(_.queryString)
    }

    implicit val stringInsertToQueryLiteral = new MakeSafe[String] {
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
