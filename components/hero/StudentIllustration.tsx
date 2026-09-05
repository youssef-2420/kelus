import Image from "next/image";

type Props = {
  className?: string;
};

export function StudentIllustration({ className }: Props) {
  return (
    <figure className={className} aria-hidden="true">
      <Image
        src="/hero/student.png"
        alt=""
        width={610}
        height={538}
        priority
        sizes="(max-width: 900px) 100vw, 54vw"
      />
    </figure>
  );
}
