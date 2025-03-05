import { VerificationStatus } from "@osu-tournament-rating/otr-api-client";
import { Badge } from "../ui/badge";
import { BanIcon, CheckIcon, CircleAlertIcon, ShieldCheckIcon } from "lucide-react";

export default function VerificationBadge({ verificationStatus }: { verificationStatus: VerificationStatus }) {
    switch (verificationStatus) {
        case VerificationStatus.None:
            return <Badge variant={"secondary"}>Pending</Badge>;
        case VerificationStatus.PreRejected:
            return <Badge className="bg-orange-500"><CircleAlertIcon /> Pre-Rejected</Badge>;
        case VerificationStatus.PreVerified:
            return <Badge className="bg-blue-500"><ShieldCheckIcon /> Pre-Verified</Badge>;
        case VerificationStatus.Rejected:
            return <Badge className="bg-red-500"><BanIcon /> Rejected</Badge>
        case VerificationStatus.Verified:
            return <Badge className="bg-green-500"><CheckIcon /> Verified</Badge>;
        default:
            return null; // or handle other cases as needed
    }
}