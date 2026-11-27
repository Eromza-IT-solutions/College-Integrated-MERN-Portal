import { useEffect, useRef, useState } from "react";
import {
  Users,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  UserPlus,
  Settings,
  FileText,
  UserCheck,
  Radio,
  ArrowUp,
  Minus,
  Landmark,
  GraduationCap,
} from "lucide-react";

/*
  Add to index.html:
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  Usage: render it in the area to the right of your sidebar (it fills that whole area).
  <SuperAdminDashboard user={{ name: "Super Admin" }} />

  Theme (same as the login page): navy #14234b · maroon #8f0014 · gold #f2c200
  All numbers are sample data: replace INITIAL_STATS / INITIAL_SYSTEM and the simulated timer with your API.
*/

// College crest (embedded)
const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABgCAYAAADrc9dCAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAADgvSURBVHhe7b0HnBXV+f//7N6yd/uy7MKy9K6IdBRsscWKHdREo6KmWGKLxuQfey/RmBhbYhext6CIXYpUAekd6X3Z3u/u/D7vc3fIuu7CIojf/+uVB8e5d+7MmXOe+nmec2Y2zhPZ/+j/DO1UIP+T1b6luLi4xgXS8ND/BPPjEoLw6XsC8b823EMNTv0f7SF9RxB1n78jkPpCYAsEAu77/2jfUE1NjcXXff6eMPzv/6N9R/B8h0Cg+sKora2tO7rviHtGo9Edm9+Pbdu2fed7dXX1jn5C5eXlVlZW5j4XFRU5TeO3kpISd75/Def596iqqtrxGSotLXXn+23+FER/nMvyO8Geg+wZVCQSccf3FU2fPt3+9re/2eDBg23ChPH29tvv2AsvvGDLli2zgw8+2IYNG2Z33323FRcX2/333++ugdEjRoywo446ytq2bWsfffSRHXTQQbZy5UrH7DPOOMNeeeUV56PT09OtY8eONmnSJPvZz35mmzdvdm117tzZli9f7oR52223WU5Ojmt7X1NFRcX3LQTyhbKvCa3lvkuXLrXVq9c4pZg1a5ZdcskljskQ1uKTHwhhINeNHz/eDj/8cNu6dasEOsF+97vfOSFs2rTJHWNcffr0sW7dutmpp55q8+bNs+OPP946depkSUlJ7n7BYNC1+VMQY2gyhtD5fUn+PVNTU51lAijQmJSUFFuzZo1NnjzZaXDLli3ttNNOc5qNm4LRiYmJtnHjRguFQk5gMBUGf/LJJ7ZhwwYnuA4dOtivfvUrdw4bgho0aJCzjv3228+Sk5OtsrLS5s+fX9ejfU+MPyATva3uu6P6AgmHw3VHf3zytb1FixZOy1u3bu2YivbCJFxNXl6eY+SqVausVatWTmBYBy4NpqLt3377rR166KE2cOBA2759u9tnZGRYVlaWE+yBBx7ohIyAoPbt27vvW7ZssbS0NDv22GPdfX8KwkPsiCFsCIEN08X/oq37kvx+IBz6wZ6NvvgQ3D+H7/5n+gtxjJiChdS/jrag+tfFx8e74+whf+xYj39sXxNW/9PcuQmCiTCDPYzzP7PhrnBL/jm4pn/84x/297//3QoKCuyhhx6yX/ziF/bwww87hnPe7NmzXZDGFRG0Z8yY4fYwnmMQbXEvhIhH+KmE4dP/KYHUJ5iGy8Etwcjf//73du+997rj0JgxY+zzzz+30aNH27vvvuuAAK4JlwRzsZovvvjC3njjDRe82SO0P//5z7Zw4UK7+eab3Xfa5lzfQn5q+j8lEDQbN8P2xBNP2DHHHONgMNqM/wfeEsg5D0FlZ2db3759be7cuc4igM1sfOYaoO+AAQPcMSAusNjPTTj+5JNP2quvvmr33XefXX755S6O+O7vp6L/MwKBGQjhpptusiVLltiLL77ogjQCAFnhX5999lkHYREIgsBt4WJgPu7mL3/5i916662uPRK9OXPmuCAPKFi7dq1DUhAAAQGfe+65dvvttzuh0O7HH3/shPlT0k8qEDQVLcY1FRYW2j//+U/ndtavX+/QEYzELZFfYA1t2rSxzz77zAmEfALEBaOBs2eeeab16tXLuSvaJSvHzV111VVOaEDj888/f0eM+PDDD3cIFWsBdZGb1BcIQgXRYbH7jDQ4TwPwZKqeEIonbfOklZ6CKD/9KMS9BPE8uR3v0ksv9a6//npPDPSUAHpijKdA7Skh9I444gjvxBNP9H75y196jz76qHfFFVd4ih2un/SZvtIO7fG9PvnH2HMfWaCn4O/JfXkCB95JJ53kff31154ydnd/CcOTO/PEfHcdPOD44MGDPcUadx//Huwb3m9vEDzf57CX+5BF49evvvpq++qrr0xCsf/85z/O9aDF5CFimPP3uKxDDjnEunfvvgPOQs11Lf64OJ/PPgzOz893eQeAAAvcf//9nTVceeWVzlpIKLGwIUOGuPOpFAAGsKJ27drtdj+aQ7jlfSYQ2mXABFdyBSDq888/b0ceeaTz5TAnISHBuaEuXbqYrGKHz/cHTR/5zEZ7vvvhONSQOf759T/X30OMlbZILq+99lp788033X1REojYcscddzjXh6BIWAEB9JX7N7znntA+FQg1qeuuu8758v79+7tsGMgpN+S0ERh78sknO0E0LGoSU7755hvr2bOnC/gIzS+XEFfWrVvnGEXcIbEj4yVo0w5tg8jI1DkfYfMdBeBan6H8xrhBYhwjLgE0gNEwiooAKO+9996zHj16OKEdd9xx7n57i7jPd0onvmB84aAFe0K0QdCEibgIAilu6oMPPnCQdvHixS5oU5GlgEhFt75b8mnatGmuQotbodpL4O/atatzc2gpLgehcD19RoD/+te/3G9PPfWUGw+af8ABB9i4ceNsypQpTqC4Qd/KKJ8gJP/etNWvXz+nJKA/3CZEiQYkCKjAehAqbrA+/VCrQZF+VJRF4Q98T1zAXYFqnnvuORs6dKgriZNpk9gRM6hhNeUC6CgWQkzBxYHMqHGBvBCOX/fCqlEC6lNoL0Rc4t4IhbiFu4TRWIN/L/b+5hOWQj+xDIELE6hwMQToTekey/jDH/5gv/3tb53SNdbvH0I/qkAweSwDOIsw0DYCIpkzARNGwlRoZwOC2b1793bWgzBgJlqJENF0n+GLFi1ylgL58QjNxnUxX4IwKL1jDbic+vfc2f3Jb5hnwX0Bp7EO8hcCPtvq1avdfekD5O9/CP2oMQSfiEcUvLSRI0e6II6boW2YgkXA2F1pF/kAuQoCoE36ijA5zvXUuWA67aG5CIM4QbucgyAQAMrBdRxnnLuq6nIfn+gziI+4d8011zirp03iCm4YxfrrX/+6w83vakyNEWPb6xaCplA3QmsQ6J/+9CeXaT/99NMubqDlY8eOlYbd4SwIxvx34I1rFgPHshAiPhs3woA5joXwHcFMmTLVbvrLLTZ3zjzHbH7j3vxOfMDNITiyevb1Gd4YcQ/O+Xrm13bDDTc4pWAO5ZxzznFWTpkf68EVMg4Eg3Jwza7abpJ04Y4EioRrTxJDuRNPnfWOP/547+KLL/YUQ1zbJGWKAS4xk4Z5cj9eJCHBO+3UYd6MyZO86pqoV+3VqCPVakX7nRDt+Rt9Zr969Rrvmmuu87Kyc7xIONHrf2A/75mnn/HEQHeOfx5bwzaaotqaWiWKpd6oUaM9uSpPAvROOOEEb+3atY4/yqV0z2s8Wb4ncOAptnmffvqpN3v2bDfO5tyjIcHzvSYQ2oDpQkKeAqrLuOnk3Llz3W8yeScgJViePIuXnBDyhv/mQq/n0MHe66NGeWWFxZ5XzQDqGtwJ+QMlux879kOvZ8/9vQQJolPHrl6LljleRsssLxxJ8s488yxv8eIl38vm/ev97w2J45s2bfau/P01yuSP98459yIvFEr05I68G2+80SvTfWlTuYun/MTr3Lmz9/7773sCMF5ubq43fPhwx8P692wOwfO9Anvx0RTomGs4/fTTXfZNTgCawe8zTQoS+bPc1zgFx4SEiP3ququt4qizbUlyV3vntXdswcQpciPxlpmdYZFwLB40JPqlQbq2pI0OAt999z3u2MlnD7fzrr3a1qkPf77hT7Z1yzb7cvxEB3e3bN7kXBZ9aQir//tZY1b7K1Yst9dff93uvucey8xsbVdcfoP16D7AVq5aYqvXrLQly5Za506drXefAy1L7pDYwljJo4gx5FUSjsvo68Po+vdsikCTeyWoz5w50wVvBEgOIHdlb731lpt7wM/CXCDu7bffbCWVURs+/BeWM+JSG7U9wQqDCZZQmGdxUz+y0PR3rW/bXDv91DPsmCN/Zh2VGQeTI1YZ51lVUYmt/vZbe+fdt2z8l1/a4gVLrKqs2gYdPMiGXfp7q87taLWJcTb2lhtt9L+et+JojY166QXlEI9aaUmRgnkrxziQ3mGHHW65uW1MblO991xhc8GC+fb+B+/bp598bmnpLe3ikZcpiextLTLaKqEKSRAz7PIrLrC8/A3WNjfH3n7nLZfgxnlxLq+588477Te/+Y3Lj4iNwHEABkrZHGFABPU9FgjWQVWWgEbOQUZOyfuRRx5xwRSiw5RHNm/eYvsf2M+Ou/FmG12WatsDLfWrZ4H4FHW60AKrZlrVhy9Y9dJFllYZZ21bZ1tCUsSqJJASBcv1DlrWWGpaiuW262AnnH6+dT/iBNtkKVad3soyA4X29nUj7ZXnXrRQSqbV1lQrwM+2Jx5/zGZMnybL2mjRGhZSAA5ynEDkoJxA8vMLLbNFpp1y2pl2+mnnWnJitkBEa4vWylKJzzWVNvGrj+ymm6+0wpLNgrsH2ahRo2QtXW17Xp6DwVOnTnXVCIDNv//9b5fIMo2ApTSH9lggmBhQlvNxBSR5mZmZrkzBbBwoBwGNlMUsUlKVldveLrv5IftPUmubJyHE1wQsEK22wKatltQux2rDiZZWsc1CK7+20HIJZ+MKq8jbbgk1ZpFA0FpmtrTO3XtYi669rU3/g6wkKd1qk1taOC5sofigZcSV2airz7NXnn/JwknKb8RIxlWmhHLRooU2Zep4mzd/lq1YucxqZEHBQAxtderUxQ48oJ/16z9ACWEnSwinWyiYKmEErEZt1Eb5n2RSW2bPvfB3+/ez98oH1dhFF1ygcf7NEiOJViJmopjkXCBMhMCCCVwXFYHm0B4JhPPB+mgFSR41IqwE3E8SCExllcivf3OpjRHMTQkrs3347/ZRpLvNDLYyT2Ycr3uFaxUXXn7SIsFySz/3N+ZldLWWun9KfLWFqjdYm8Sw5SSlWliWYdLm0rJSS0hraYGUVAsmhC1ejEm0OEsSczNqyuzJK8+VQEZbUqLuQT/FSHVV4/JkHWVWUVliBfkVGluajlUqbsTJ91daSnK6LFWxy10j1OEFLap2Bbb0XfCX2V01VFKyxf50069t8pRPBZ/j7K677rSrr4zNueCuKUoS25jPV3B3rmt3XNYPDupYB3Ui6kwXXXSREw6FtwsvvNDNyOHKHnjgAXv5tdfF/Bo77pe/srwDDrPJlixlS7FwlKTQLF6Wldgm06q/+cbKJoyznMxUS2qdZTVJYnNE58YnWlSMqlasqdH3hPRMCyYmSYsTLCk+zlI01mTaCAUtPS5qk99/04afMUIaniR2erZkySK5qs22LW+jtvVyTwXWOqe9rlcfZJGBYKLyGQkjkKDz1aE4JaoeYtHVap9/kM/SsO7b58D+btp48+YNNnHCly5z796tm1Ng8h/4R8KI9SEMeAntSjDw9PtQphnEDUASLCLAJVHToawOwqAGRIeoVTFnXVVZY30H9rcuJ51iX1VkWUV8C6tRv2oCsbpVUFKp7dLB2pxztlUVrLGVT9xulR+/belVJRYWf5Lk9nB9kUiCtpAQWNhSAyHLkItqKSFlC5FlBsOWJg1NlWAg2o2Ll1lIEZYsW2BFxVusVesUy2qVbHPmTZOVbXe/6SSLr+sHvPL55cH+2H87jtOeTtfnoLVv19Ouv/Z2a9O6qyul3HHH7c5dkZyyiM8v0xBLqOeRwVMAhS+7oh8kEFwa1kNpG7eERQBFKR+ALHyNQFu6de1ol935mI0pVBBPSNQN1al4ucZgbD4DgSTXJlioZVcLtWhnpXlLbe5z91n+e49bjgbVWoxPFROSgiFL1rkwPSU+IBuLt0S5m0RpM7aQqHMi+l2OcAcX4wJxdtrpp9qq1SutfYf2tnTpcjto8FBLkQsMqR0ZgGOA2zif71weQJj8F2Mgx2M/uhP1v6D17XOIXXDeby0cCjuF8UtAjJ+NEhHTyhROmQR75plnmiWQ3XZZ/MaMH+YFcsJHIowLFOCogvodI45Qqk4QbHw3mmyLkzMtquP8o1gd0j4sxobFmLDcRFIowbLSE61g3iyrLsqzzQvmWER96NCztyWlJlhKMN6SJZwknR/RlqDvCWJ4oraQtDzkfq+1T9561YafNdxCshz5Hvl+xRgF3VkzZ4lRYWl3Z0tLaaUekI9oJ7WPQ/WRgOOXO6j/6r77ewSljzo7dlgRJiVF3+Ir7P4H7rNeQlQxS+N6c7Af9IaVHH300W4GFNQF+ec0pB/ksjBFpM9cAIgCbH/KKae4EjVIqz79/Oc/t4P69bRlY96ySFmFxdUFRrQxXowMi5ERqWRILicuQZYy5CgbcPHlFkhKlhWW2sy3/m1Lxj5jwXBUQVsWIsE5oejapLAsJEFCkV+L6HNEt04IiVmKvgw3LnYzt1Hzmq88g6D5xRefaV/kmAs5FdFntxEz9OG/3zGImKuCUfQbIcdL8Hnb19r4CR/aPffdbT169nDW7hNKS75DPkL97MQTT3Q84viuaLcFguUwQIqFzFGQ1VIsJAv2NcTfENBJPz/Ojs6U5Mf+y1KLCwRhA5YgG0G7w0FpbxBmR6XpZmmhJGu//xGW1aW/cog0qy737KPnnrJVY16y5JoKS5bBpoQqdF7U0tXzVPEnUb49whaokaXUCEAgEJ5EYiU5DgwLkMXXRG3t2lXWsVNbmzBpjK3fuFioq9IJD2KPN4rFibrP+oAQ1NWYK6vbV5QX2FP/esj69O+mfKa10Nl32ch1zG6CtoizCATP0Rz6bkvNINY6MYWJdTDNSdCiHO2XJL6z6V+ikMZNf7jOshbNtzbrF4jx1RaRv09RW46ZGmQy7iYorRcXUjr0suMuu9HSs1vpajGyuNw+fOxJWz97oiWHKk2eTcKUdajnEY0xoU4g7N2Ydd+YFscGx9cYxaxlw8Z1Qna1tnDRLFuwcKZgbUWM+fp1x+baYM/8OxtfCfW0UWmvvf5vuaIldszRR3KSjn2fiJ8Ed9rCUgBBDz74oJuK2Jml7JZAMPnrr7/eVqxYIfx9l/OTlAuYpHGDqKMdn9l51TLpXtazXStLXDvLUiuLzBNDA3IvYXGCLTEYEIPlerQPhmut9YAhdtUjz1pSy1bG+vvK9att3HOPmle8WYKX1uo8ne4EEMTSNIoESSDIQWKC/gXUh4DadsFawkJIEFn6sGEn63tU2fl6oZ+xShJjluK6XbfxOXYtG5YRa2/L1nX27pjn7PAjBltOTmuabJScQmojLcB1U75nIR4rMal5NUW7JRBuQNZJUCcjpzTCXAD+s6HU/Q7FCx0F5fcHDB5kG778xA6QS0mEeYoJmHGC2wjQ2iMUJVvhSNjSDxhoFyrpatmts5WJeUunT7ZJL79qKSXlQlS1ck+yCvE/UYJNkoWlSFAOwym1ds6KPsnXxwVq3RwFTCgrL3UwFWQEAurSpaNcXKV9/uX7cmEr1V+lgnHVulZ7CdFtO6xE49N/8+fOto1Cl8ccc6wEFJDz1TidFL9P8OWdd95xPKP4euONN+5yUmy3BELsAFMTP8jOmfw54YQT6n5tgiQUfGzr1jlWkl9oicXrLTFaJmQVZxElcxFl8EmCickSHPvUUKLyjKC+R2zoEcfbr2+6zYJKBksqK+2lZ5+11UrI0pRDJCleJIhxuKqQBBNSe3VZiNvQbHKM6mi1XXbZb+2110bbqJdetNEvv2yF6keChNJPSPDIIw7T6ZUK+tNt7vzpShRr1F8Jkq1Oqfy44ik2LZbrrVJfOnXs1KQgfEJJQaKsBWAxOCjrj3/8o5sga4p2SyCQv26KKiaZOiirOcR1Xq2YV7DeMhRHwsrX6RZbSB0nyEfYNMYkbSl8DqfboGNOsj/f9bD1O/RwJXat7P233rTNq5dbrQJrqLbKlVSCaiuAFmOl2pSeOCaWlhbZ9BnTXFKJZro4pz5MnDjBud+wFKJ9+3Z28knHWVZWmq1Zu8KmTplklZWlEoDyJFlhzEpYEIEHqLWNm9daJDHilHMX8nACAf7jprgfbp7yElbj52oNqdkCASNT83/88cddds7GutrmEu4pqIQyXFBk2XJJSfqeAoSVJidosAToxJAEJM0MBz0LynVQWUrxInbkKWfZ//e3x+y+fz1pJ484XcyN2PzZsy1/yyaLV4wKimHUtGIup87FiJEBCXXsB2Ps2GOPtv3362kH9OrlFGPBvPlWXcWTvPQsTggx061mARkVFObZxEmfC9ZuVBuKLfFV2mIWA4KrFtpzuZY2H1g3Rc5lyzuQGFLxJi9jsQZJIqthGqNmC4TCGaUQAjkVTNZS4Rd3mDU2vRMif4lTkoZbwU0RjF1Cp4GF2Qjo6k1A/wvqc5iMV+fES9VD4QTB1a7Wrn0Hh/mZV3919CuuipuUKNglzjIQzpV8HcKiOykpybZgwQI7/1fnuwXVPN3br08fa9+2rWVnZulcaUHddcmyoMEHDbQhQwc55DVt+kTFlVVqR8KWcAnqsJ92K6vETFdtjAmkKaH4PGHsrIihnEQ5nr6QdDeGtpotEAIjJs9ySlwW65EIjM0lTLYqGrVwioKa+hGsYzwlDBLEsJgfJlBLYsQEHSKXdrEhpOAZFNNqNLC2OblKBsOCnEfbnLnzjKd1oRgaqtt0TWyTgCQdgnhQcSkgAQQEJnwQskOJtAOgJcpMe/bsYgcf3M+6dM219etYXkQsIZeJITc+o91lFRX+pTv1XFx33nnnOV6xfJYFfCSJrIBpjJotEKZhWbGHZZx11lmuhtWUH2yMKCNU1CoIZ6TK7LUnOdRQ2FLjFchrFdA9uTANICyXEyS5k+uKlxsLSFDxYkyuYkhIzATYnn32Oa4kUVFebatXrdbAdRMxOaZ1Mc0T+2L/9JWZPTb3K5YhxrrPsVMdOebqfy0yM/RZMUSfOcYdfQtMTkx2SK5AwMCdr21XBLJj+RCPUjBxR6BnJeYOhahHzRYIz/Ex8UJVk8eN2Tdmco0RgqMQCbRNb9XSyqNVliRZJtcogEfFcAkoHqgZV2FxFfkWKtmqG26y0u1rrbx4i1WV5ltB3mYnFNjIhtW0yW7tamEVGrDPbJ8YWLXiXljoDQE6IYkBWIpbsyXBxqzInb6DECD/Z2j85so87igWHUOL8WqD+Y7mEDxiwo5VkFgW92bxHvGkMfpu8WknRIbJvDHogkbJ0pmE2hXRoahcFcswM1qkW3J2joXyhWK2bLZNG9fa+qISs4oiqyrbZpWFW6102yYrkfVVlVZYlQRFSYbY0bpNrtxJD2sn/9+lU0cNMtOyNdDysiIJE+bVitlyQ9JsXzTMWVAOJx5BKUoKA0JWgJHtBdvdlC1CoY++ALiS704YcqO4QCcm3SOg/3Xs1NlCoQS1PU/jqpHLjcWhpsi3AtYx8xlQQUyh7ETFo6GVNFsgrJVFqqwoefvtt52VMIce6/x3G21IxA/mSzKyWlpxMNkqVy6x0tmfW0pNmbVNz7A1a1bZps0bbYuElLd1myn2O50kxVv/ba3Nn/W1mB60oJgZUoCJJCZaWnqqW9pJn/oP6GcH7N9dDJM11gg9qYFaucd5EsgRhx/unmm//PIrLE7Mi+q3efPmKsCOjh3TP9brsg6AcfTqfYAC+xBbuXKFTZwwyT4e97mNGHGhde+2n3NhOa1ZHJFkS5YsdcgzFEysG2XTRMxCCVgGSzAnDwEk+VPf9anZAsHcQCxkvDz7R3Cn7r8rYUA8GsCAz75wpG0vlwmnJth+B/e31mKqV1YupBS2w486Qn4534GXjes32vb8AuUFqxU8y10b5BEZLTKk1S30OdHtGdiWjRvtqccn25zZs+y6P/zBKQjEHHdJUbGbMKPUkp6RgZRlP54dfthh9p6gaN72bW6evn2Hdq4t3Mo3c+bYy6NG2bLlS+ys4afZsmWrbN26ZUoEO0oQiZar9tLTMmyVxpO3fbvQWVt3v50RM4k8CIRn4TNVDrxLYwXHZguEdVDAXMoAZJ5YCGhhV1VMBEapBep6QH9bVlJrESV1rVrG1l4lZmVY18B+lpqWKnPOUBZcZT269VDMKrKKqnILJYRt4ybFk9JSaeVit7C6qLDAoT76EQMWXmySbMu2mGVJKFOnTrO27XKdm1InYr5IxO/8n/VjU6dMc/MUrRSLqipjC7Hbd+xg3Zd0l0avsT59DlA/SgS7dY1cIvlNm5wca61tlZJT+tKh3a4FgiBYe8DyU55DAeDw+AUPATW0kN0O6jSM//OfhNoVcQ6VTvf8RcvWVhGMWFiWEUxOtBWrl1iXbh3kpjZYdVmxdenY1latWG7dunZ1bo74QbJG2WGJfPDkyVNsnsDEmjVr3aAQBgPq2rWb9e3Tz2l7UEEcI3n0n4/aCSeeUBcDRPV2bH0P7Gtbt2y1yorvJmhk773ltk488WTLze0kiw1qQyBRybRGSpPmqhRFRYUut/AtcmcEyqIgC7BhdpHHJZqykGYL5DCZOTEDzSIxHDlypPOhu6JtW7fa7JkzrX279lasHCCUKlDQoactS+thCb2PtFnfVljrzoOsIJpoW8vjLKddZ2nSQlf3ycuLPZ2LVcar89nZWdazR0875pij3eoOHjVjPoaECzjOYGEQcY4lOKk7WQ+FguCmmGjDUv9L2FAMV7l/wGNZGEaGhaAETMaR6S9dvETC2rVAIII5hBBw9wikMXffbIEwULA0JWQmpMjYCUw7I65h5XhZcaG1ZzmptE1dkoXkWk2WgnCnQRbYf6il9jrMuh0yzLK07zTkcGt/8AArz0i2JFkIIJd602mnnere5MCDM8wrMPmDX6a0zePQxAqshXvyhBarX/jc1AYzYMzcOXMFBGLPGZqYy2clGrFNAohqT9Lo6XON3FZUSK73wQMtPbOFzZ4xs64Es3Oh4CVYgUIxFveFwuDuGqNmr8uizM5DkfzO4MnWsRJQTlOBvbam1u6//z679bab7dBTTrasfkdbWSjTImGhJV1C/SpZqTlrs1IUK8jWk8JCHl6Vmxvx5E7i1UZ1ZYWrGJOhp0qzpbj85/qMdtNf+sAeQRFPsBCeBeH3xvrHtbheUE9bCXzVt6vs0CFDXYVAP7r2a7R/4aVRNuTgQ8TMbMFqSqIIp9ZuuekvVhOtdglermJVrLTyfYJfuKsvv/zS5SPEKe7NklNXoKxHuOlmCwTXgWvgmUDiB/UkXBjm2xQRdC+6aKS998E4+915v7TWiZRNlJu7USv+aMfnWFjWV5lzjZIvvDX9yVcHwfqsTGnZMtMtUgCGsSia32G0LwhcAS6USurZZ5/tfv+uK4rdoz5FleeEIgnqiedyHmC1y2F0rftd96oU00kma9UPDtfqfqzXmjNtpk36+DN77+13FG8UqxqXh+Mnj/HxBBYLHugrfWMReH23xR6BNBtlgXJ43R7wFV9NgCcPYJlLYxoI8YDLhnWbLDUxxU7r29P6V1QraApdiQkBWUAcAThBSZu26sSQdhGrjShPSU6z1z79zBXiEBqx4OGHHlJOcYRjvL9KxAXsevdmsBMnTnRvkkMbfYIpsJj/1+gzAoeiylmqYLrcUYV+rfJ4r6N+VzvVOq9aQbxSLqu8tsoJjRyG66sqqiyhYyub/MUXNm7ch3bCCcc3yQOOE9R//etfu6W28IyqOcre2DXNthDyD2oxCIOcgOe6iSGXXXaZQ0ONEdOXZ505wrKFft65+nfWZu06uZ2I1USk6aw0kcZ7ai8KtK0osTatcwUxJZCkFLv6gb/aC2PedH47LTXdHvnbwwrcp7slPfmFRcrQy10McNlanQ/DQnBVJK71BeLGp3/E329Xr7JFSxc7KA0iC8h91spVAqR0wAk5TlaaoPskpCVbYpssJbMIjdJ71LnhKsWEwpVr7aGR11jnzBwH6xu6n/pEuR3XCJ9IUlFmio31BcLnZlsIA0IQJIQEJCqWBHjWrvoL4xq6BwiBFShnOPpnh1jStkILlgliauTxCD9B2qp9jZDXpwsX2ePvv2cnHXucnXjUsTZ15gz7fNYU576kvNKwUged8b8Zael27/0POMY+9ug/rU/fvv+Ftk0QKMlZiLT/JVkdDKLcjuaS9/ArbpD1v6T7zHVQbum6Xw+75KYbLNAtx6IEdFkIllMVLyebHLGUVi1t8fzFzp03JRASahScx/x4fgbIW28p3PeoWQJBegiF4MTDjkBgViliemByoHBjRIZeLVTRb9CBVrMpn/Uz+BVxRpvcAdr24ZJ5dsULo2yL3MAXy5fZ059+aBlZ2Tbiggucb06Q1lKqZt3wpZf+WpfHgiQMvuzyy2zUy6OtixCcM5EG5Mcm56okjBpp+IaNG1ym/uADD8rKytx0rENX6lNVtX7fsN7NfS+VByjYmmcbf3et9RzYx8664XKLZkasSv2OihdViUFLzm5hG3Q9jM7NzXX3bEi8K5InBBAas4fwEcTVmAJDzY4hEOjqnnvucY3h0qjPYH5NEQW1iNxTD5lqxbwVupuYpuAYCwGeVQZqbeLcebY9qnxGmpkjtPPbq6+xM04/Uy4n2ylCrONxdqzg7QoN/IknnnRaXqxMfeWKlTZtyhQ34RQSAqtPvjAQhBxNTCDaCuXuWgl+UqRsjDrldbZMuTtPySgCW7FwsSWJgbWKf+XRgEXjY3HIEzpMz2rp7kHhtLFYigvFDfF6WyAvLpw9CKspalxMjRA3I6awIo+1WEidGURKKC5oSvINCZcVjISsfSBiSbgGsuJyoStZQ3V1pUVq4uzCQ461jnJDaNhzzz5nF4+8dIcw/ODNqEE63ZUU3n3X3Xa54hbu58yzzrR+fftJljqvQR9iMUN+vzbqJsYqZR3V+k4sbJ3FUtLGiWTRlTNgrjbXJn2RwiDYKixJbRJzUjIUmHUNK+pxSw2JVIE5JJJXkBbTtzyVjHtrjF9QswUCwSQmplgsR5DCbQHdSBQh/ybsERL1pjgNLrM6zlKqlGBVqtOCkcqmLESWL3fWNpxi++V0sCsEoWOPO8fQEjEqJuhawcW1Ti5r5QLjFVeu/+MNduihh1nb3HYue+d+bMQbd3+di4VUCSEBXXFZCEdO0soUN+i302YY3WADxfkJpmtTxzz1o0KuibdmufZoi9+UMXJOQUGh2zck5oxID3g1B49sIBQKtLTZFO2WQCCSLgaEH8cnsmGWWI1P3BBm4tagaGW5xVVVmkeAq6qwGllHeU2FlQtZTV4xx9aVFtpZAghPP/O0y3MQCJo0fvyXLijedvttrii3YOECh+eTpGFk6xMmTnDYvkyQnHvVamOoWEeU+zvGaZNWx6BsjRWXFAu1pYqpYqA2n5G+AHCR9Rnmftf3al3v3B/talM2oX+xewEOGgoEnsAbFk9QpiHO4PKbijU+7bZAMGlWKwKBqVaCuljagn/0B+IPjg3kQjBFCLVyW1XVFW4m77GvJtvJr79qV743xroPOkgQtqPlbcuLBVT5b1bUIxRKDARGkB0lCJ7dw+306dvHlSFOPe00O3P4Wa5cEpXlYSZYAjkELooNS6mUMGAqySCTbQgeSydXoj0ET/sItj5zEdB+++9vSWkp8rYaAy5L7ZfjCpXHNEWgQgAQCkN7vOUIdLez+AHttkDoIFKGMfhHSieUBYDE/mDYOI+YU1YStZUFpVZZWiFTKTavusSKyopt+pbtNn1rvlBKhQ0YNFh8jAlz0aLFbmYSd0dpg7eH8pnFeVgHTMTsyerT0tNtnVDRlGlTbe3qb82TOwQB4+srleSBiEjsKiUU2aaV65e+hw2xjyZ9aRddcrHLBZhO5c0/9J/ZRZ4gxtVgFUDfC357qR16yQj7NlDuHjRCwBVqs1iKlb89X2ONvfzZuTZ9IYHGYqiK0xbxg5obbyGCb5znb43RbqEsn4gfdJ6k0K8XsU6LRcWs9PZvhnuLfj7eJs5faL2UBMbXlFpYcT1IkVHhxOUHGgRPRbGHcC9O2yVcXBdwF8IF4oPx8bhHdw9uwya1CgjBedJwFsvhTqrE/Cp9jsWQmKWUy4IuueZKO3joUBv76pu2dO4CBzx8l8P2X4bFlG/b5i02fdJkC2anW3andhbt2NIqlIdUlpRanpJDXeRceKyCEOfmPCjAImReBwX0J0n1H2/bFe22hUAkg7zyjoBOp5m75nFgsnc0xCdm4AAsH0yfYqUpSVYjlBUoi1qwImrdlL13VUez01IVG+arnVhAxTEDFxEAA0AobDALt+IzjX1ZWYl1kNb16t7VWmVkWK3yCK53AR1fz7USMNeXFRbbN+Mn26N33Gc3XXWdjRsz1vl1+usLA/I/861S/fjo7ffslVv/ai9edat9/cxbVrOt2LVZtinPCr4VitQAqefBB4jnDXmICd5QJmFhIc+zk6v599gZ/SCB+ITPJTlkRTxComRBB3zGEdTaq2Mr5FY+KdhmFdGQ/EmNRXTd1W1z7NVDhtgthx5ssyZPsk11E16gquYQb1xIk9Y9deud9sxt99mQzr0sXMWAWeZA/sGmGEa1WEc+GvehXXfRb+zNZ1+w/M1bBQBi/t/X2u/t63iHm6JNvlfmF1skGLI4tbn8vS+scnuhHS5hUPmGsGqIdc8kz7SFoHCNLKNqDu2RQKjmEqiYvEcrcGFoCJoHMbF0+BGHW1lV1N76doMt9YJWJqbHK27k5hdYn4JNdqZGmlmw3d7/YIwbGFa1sw3L5Bnw62+43gboXgO79rCe2W0sK5Ro1WUsXpP1SBoOFclKCosKbeXyFbZ14xa5pjL8pOtbY7rqC+M7pGMoF7nDicNOtqSEiG37ap6teOcLCwdCdusttzh3BBHIEQauuz412m5TpJu5F6TIrHf75TPSCPf2G2Wqbs8bgBQkvaOPPtoTMvKq9ftX0yZ5uW07eJnBVO/adp28ZX36edX9+no1Awd65UMP9WYfdqTXPy3FGziwv66ZpD7UvSimRmhf/aq/cVxw0nvkkUe8xMSId8nZw701r77r1X48yav6fLKXP32Wd/QRR3hLN633pq1f7t3z3ONel4G9vUhmmpeckeYF4+K9OJ5Rq9vEqF1uoXDYO/bE470H3nrBu3HWe96Zbz7kZQ3s6YWCQe/iX5zvKZt3vKB/vCloxIgR3qGHHuop9jkeNhzDzojz9+jlM+qwC+oELSAqVoKFgI54tg4z7dKpi1sYMPbTj222UElFbZUNSAhYqgWsSHx5cO239mlhoau+TlNmyxqszrKUgHwz7dffgKes/OMtEaWlJbZu/Vrr2bG99WjdygKCoVRpX/3sE8tuk2sP3nKHvfH8S7Zl9ToHt2srmX+RtqOsasuZiMbpj6Mxwn1069HdLrrrz7aqVci252+38X9/3vK+XmQ9unW3ex+439q2b+/iEHEKfoGugLZUMuABawLqU1P3goideywQn8D15AzMR5BLIBxm74YOibkZgvb4GVNtrrJaFpL2DiRYSnyFKaTa9OISK9Y9S7T/avwEW7RgoXsQJiEcdJ1cs2a1kNdY97Kw99571xUbKTIOHjLAzjjlJEvV5wS1X6mc542JX1qF+lUq99Qmt421UTIWSU6y+FDQgmovEk5w42JNsZ+V4+f5zLgh9owtM6ulXXjl76y0R7at2bzBvrrjKdv61VzLVfb95BNP2pBDhrqlQKwgoZpLzCSHggdUdZlGJimsz6ddCaTZ8yFNkX8tpQ7m2XmDATGEwE7JgCSSjrlc4ql/2wMPP2o1+dvs1Iw0uyQ1zfqkJ9romnJ7u6rWjjvtbOtdG7DpX0+x/yxcZsUhIa9wvFWqP4P69rOTBg2y1PiQjf7gP1YQX2W3XHGl9awOW4YARSAStFL59xHS2ntHPW2FIQVzoS7iRllZubL5EquRlVSXKwFU34C6+WJmgay2UPHMaafGU6t4V15c6qaMB598rIXbtrTxYvA3r39oRcvW2IB+/e2Ou++yIxXMqdZ/MPYDN89P1RsejBw50uUlCAcP0VxhQGT3eywQn7iGOhdvxWHFCC8bBg5SBaUaypNDTM5QjLz++j/a1mVrrW1CnA3LaWkXZLc2BRmLy8iynIIaKw149kcF4veWLXXvQ0lJT7O/3vAnO1oILTEarzwgzrYl1lib5AxLk6UpqlpcJGCFiSk24m8P2p2jn7bi1KByj7pZPvWtQlk1CR0b2TqkGOd+q1R+ApTFUsolrALB6VIBj+iGPJsy6l1bP/UbC8njHTr0EPf3SRgfgAb3ST7GHygj6DM59tJLLzmkibvaXUIge+UFZhDSdysJhTDI4lmAhrWgPUxukany7iyejVDQt61yXYs2bLSJGzfajOJ8i/cqrL1QUlp1wNIFVCvjy211IGIZOa2tg1zEyV26WdfCfMWKSksWNG4RDFiS+hkQxsXXK/5aVSBsb0+fZoedeZKVg7ClwlRmmaaljuXmMQSB2RBMpfaV8Z6Va1MUsFJl9yXVlVa8brMt/2CCTXh8lJUsXG3dO3axa6651ikZrgjFQxisLeAVTaBLrIMlRSgkM5kup9pN2isuyye/DepLlB4wW0oG1KRYOkmgoz3WU3Xt1tUKS4ts2leT7fnnnldm+5GFyqutZyTFjsxuYce2SrdeqZm2JbWVVbZQH8K11iYu2dJ4eklxgBfWxEfCFidBB0IJ5oWVGyQmWH5ypp3z9BP2x5ces4LEOAkAocSEAQz+7xw5ZRUdlxDJ6gn6ll9qG2YttPmffWVrZs6z4vVbrb3AwTnnn2fnnn229eq5nwXlGnlnCUGc9QUslANosGiauIlb5plLHwbvLmEhe5SH1CcsBJNnvp0gjlDpODkDAZ5MlTdbIywAQFpSqv3858fLxF9WoB5jA486wmZFy+z+tavsghlz7KqZc2zD2k3Wce1W67Fpi6Xlb7Cw4kFIVhQSA+PrtrjqCvOiFfL95RYtl+uRm46K0SxkYCMppLYVpdyh0VZpk9eT25O1KDn0NhXY8rc+t+cu/ZO9ct2dtmDM57pPjQvUn33xhd17x13WX/ErQUx+R4kvK2142Y7/SiqelSGhZUaQBYS741Uao73mshoSFoJFICTQFlk86IjA361rN/ewKJNOoJx2LIQ7/TQXb9JSky1PTP96Q769v2mlfVG42TZUVRsP8KSGwrzYSXFFwo+LrS4Evsa0Kt6KA8n2zsJv7JAzTrQygYFquaxYuRx3JctXkPcU2Iu35tmGyXNtwYv/cW7pm3c+tiRl+YcMOtguliB43+JFAiJZmS13BGIlEY7pgwYPdtAW4ILQiIlMBVCk9OtZP5T2qstqjGgD7aHEjSZxQ6q39c06NgDgpvogTWZBw2ZZxIyps23UK6NtwpefWXlFqWUlhO1AXsHXvZ8dpZiSqJyjREzeGIxYufq7rarENiTE2+vTZ9jPzxtulfo9Phi2iFxekFWQKckWUiyfMOZDmzN5mm1fs8GiZZXuGZNThp1ivzj3XOu9fy9LFYDgxWhuFrIeIRB487msBmGgYKya5DkZpmWJn3tKexVl7YwIfvwpIuYE0CR/Rg76rkCE//VPCa2EUGZ527bblCmT7cGH/mrLVix3Cx5ap2VYthAN89xZCvhJLbPcVSVlRbxiSIlqByvUwEorKtX/dI2l2rksBrt9W55tWrveWC5aXFjkqtGsl6Ikg0WTM/DIs9N0rK8e+f2FNyxye+211+yWW25xcBfaE8vwaZ8IxG8X66AAiQur33lfIEz8sLiaRw6+njnTPX9RIaYSg7LF9KjgaO/+fS0q8PL1jK/d2yFYoNZfx2bIKsaNHWsdO7S3Aw7oa9/MnaNMP+yYhWvkJZXMOLKwYbIE/M2s2c5CQX8EZcr5xDu0nPobpXMybMZfv68+n1jYwbn+/Mbeor0a1HdGCAEGNOZjET6TTpdfcblb9nPPvfcqdkWEXHj/VLy1adPOrlACWKkAvn+v/a1Vdiv72WGH2dWXX2Gzv57hXgQweBBTAR1txPBzraigyA45eKgNH36GLV222M1QFpUUW2FBgaVnCFBLMXjv7oG9e7sqLAIgX+KhfsAIgiFnIkBTyUYAPtF3NmDt3haGT/tEIAwKxtcfnE8wgEeseYfiub8414ZIO7t07uLg5e+vvMoukI8uVVad1SbHPhr3kQWVd/AgZ1p6hiUnpVhUgTokcMAjz0FZRaHyG9xPciTRahW/qsor5AYoyPMyAimEBJgil5epgM0jAkznMo8DZAVwoPnEOR5h5u+eYN30G49Bdo8W86wMAIXf9jb9oBnD3SG0iGSRF2IyWDJaGMZGfoLLYM6d2MIymaKiYp2/1SGatxQ4efk9iwOYift21QobqO8xBsWeTWEBtq+5/Mtu1cq26n6ZLTNdIOa1Gk7rdA0MxOqwWF46sEauJzlJ+Y3cIkkd9ydIk2OwShKYjsJQBkIYsb7G3qyNMClyMlu4N2mfWAi+GqGgZfh0fDNIheBI2aH3gX3kzkL2/PMvusyesgOvUbpCbozXBpIFs6L9lGGn2rSp023ON3OVNT9grVrliEGs+qhwj8SVCqHlts211994w70OqUOHTgrgZkXFJfbZZ5/buI/GGS+kYfF23wH9baESO147i7BZ9Ef/UBK0H6GhNFQVcG0s42ExB/kUggU1Isi9TfsEZUHMXVOSpl2ydX85zGOPPeY0Du0E9eA+ECAlCRiBzlRWVihHOcy1wbOOaDNIjdI//aZNQENsxjG2LIf1vhlyawAJfudazmFqFdTHHsETK/yHaHhlOgkfL9WhLsVKGl6XTuyDJ9ybhRb8uQriDdQQpOwJ7TPY6xOmj1UwUPJRNJA308EQSiugGzJ9VpWgsWw8oM+zefSL8xEc7gTtZB6GHAA3iBB95jAWiD33pBCI1iN46lCsKcMqiAVcR5BmQQLnIixqbggM5jPPQ5usemF1DUkuGTr38un/twKBMcwV4KN5hoPMnOWoTAGzRJVnT1gPDERF29FgipEwC2ugBIO21mcG/a5PDZnj/+4Lyv+dz8BdBIBLpCLNXAbWxXw4wsbNMgcDoUisgCHY8+o+313tLWFACISOualFCWGP/6BLY+S3rcG6v72hZMr9nREJ3B3/+OOPPTHck9Z5sg73WRbk/igKv3O93079bW8Q7fj3YNzLli31lBx6cofub4L84x//cMfpK7xhDPfcc4/HH3KRhblr9ybB8x9dILTJX5455ZRT3J9NlXv6zh9Y4ffp06e7P4WqXMVTsGxyoJzPtjfJb5MNxiuOecOGDXN9EsJym6zG9Ru+yMo9WYsncOK98cYbe1Uo8PxHd1lktUzq4Arw98BFXA+FS5JF7gfh3wnkzDBSztjX5I8dKEvtjb7hGv3j8AcgAUmJ3EbMw9Uylr3hur4XQ9i4uS8Qajt7SrSHMAiYBFECOIPh5v5xiBwFRMTUJ9DzpyKQGBu8gAf0jz3CQSAwnz0b/fUFsTcEQoxtUiANN19L2CB//z/aPaovQDYEDVCJbQH7f8fskQJQvrdZAAAAAElFTkSuQmCC";

// Optional blurred campus photo behind the banner.
// Paste your original base64 string here, or leave "" to use the plain navy gradient.
const campusBg = "";

/* ───────────── sample data ───────────── */
const INITIAL_STATS = { users: 1250, admins: 4, reports: 125, uptime: 99.9 };
const INITIAL_SYSTEM = { active: 95, inactive: 5 };
const INITIAL_HISTORY = {
  users: [1198, 1205, 1214, 1222, 1231, 1238, 1244, 1250],
  admins: [4, 4, 4, 4, 4, 4, 4, 4],
  reports: [112, 114, 117, 119, 121, 122, 124, 125],
  uptime: [99.8, 99.9, 99.9, 99.9, 99.9, 99.9, 99.9, 99.9],
};

const ACTIVITY_META = {
  admin: { icon: UserPlus, bg: "bg-[#e3ebfb]", fg: "text-[#2f55c7]", title: "New Admin Added" },
  settings: { icon: Settings, bg: "bg-[#fdeadb]", fg: "text-[#e07a1f]", title: "Settings Updated" },
  report: { icon: FileText, bg: "bg-[#fdeadb]", fg: "text-[#e07a1f]", title: "Report Generated" },
  approved: { icon: UserCheck, bg: "bg-[#ddf3e6]", fg: "text-[#1f9d55]", title: "User Approved" },
};

const MIN = 60 * 1000;
const seedActivities = () => {
  const now = Date.now();
  return [
    { id: 1, type: "admin", ts: now - 2 * MIN },
    { id: 2, type: "settings", ts: now - 10 * MIN },
    { id: 3, type: "report", ts: now - 60 * MIN },
    { id: 4, type: "approved", ts: now - 120 * MIN },
    { id: 5, type: "settings", ts: now - 5 * 60 * MIN },
    { id: 6, type: "approved", ts: now - 8 * 60 * MIN },
    { id: 7, type: "report", ts: now - 26 * 60 * MIN },
    { id: 8, type: "admin", ts: now - 30 * 60 * MIN },
  ];
};

const STAT_CARDS = [
  { key: "users", label: "Total Users", icon: Users },
  { key: "admins", label: "Admin Panels", icon: ShieldCheck },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "uptime", label: "System Uptime", icon: CheckCircle2, decimals: 1, suffix: "%" },
];

/* ───────────── helpers ───────────── */
function useCountUp(end, duration = 1200) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current;
    if (reduce || from === end) {
      setVal(end);
      prev.current = end;
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const v = from + (end - from) * (1 - Math.pow(1 - t, 3));
      setVal(v);
      prev.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return val;
}

function timeAgo(ts, now) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

/* ───────────── pieces ───────────── */
function MiniSpark({ data }) {
  const w = 84;
  const h = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i * w) / (data.length - 1), max === min ? h / 2 : h - 4 - ((v - min) / (max - min)) * (h - 8)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <path d={line} pathLength="1" fill="none" stroke="#f2c200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spark-draw" />
      <circle cx={lx} cy={ly} r="3" fill="#f2c200" />
    </svg>
  );
}

function StatItem({ config, value, history }) {
  const { icon: Icon, label, decimals = 0, suffix = "" } = config;
  const shown = useCountUp(value);
  const text = shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const delta = +(history[history.length - 1] - history[0]).toFixed(decimals);

  return (
    <li className="group flex items-center gap-4 bg-[#14234b]/70 px-6 py-5 backdrop-blur-sm transition hover:bg-white/10">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-[#f2c200] ring-1 ring-white/20 transition duration-300 group-hover:scale-110 group-hover:bg-[#f2c200] group-hover:text-[#14234b]">
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">{label}</p>
        <p className="mt-1 font-['Playfair_Display',serif] text-3xl font-bold tabular-nums leading-none text-white">
          {text}
          {suffix}
        </p>
      </div>
      <div className="hidden flex-col items-end gap-1.5 sm:flex">
        <MiniSpark data={history} />
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6ee7a0]">
          {delta === 0 ? (
            <><Minus size={11} strokeWidth={3} /> Stable</>
          ) : (
            <><ArrowUp size={11} strokeWidth={3} className={delta < 0 ? "rotate-180" : ""} /> {Math.abs(delta).toLocaleString()}</>
          )}
        </span>
      </div>
    </li>
  );
}

function Donut({ active, inactive }) {
  const [hover, setHover] = useState(null);
  const a = useCountUp(active, 1100);
  const i = useCountUp(inactive, 1100);
  const r = 64;
  const c = 2 * Math.PI * r;
  const aLen = (c * a) / 100;
  const iLen = (c * i) / 100;

  const arcs = [
    { key: "active", len: aLen, offset: 0, color: "#1f9d8a", label: "Active", value: active },
    { key: "inactive", len: iLen, offset: -aLen, color: "#e0473b", label: "Inactive", value: inactive },
  ];
  const focus = arcs.find((x) => x.key === hover);

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <div className="relative h-52 w-52 xl:h-60 xl:w-60">
        <svg viewBox="0 0 160 160" className="-rotate-90" role="img" aria-label={`System ${active}% active`}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#eef0f4" strokeWidth="18" />
          {arcs.map((x) => (
            <circle
              key={x.key}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={x.color}
              strokeWidth={hover === x.key ? 23 : 18}
              strokeDasharray={`${x.len} ${c - x.len}`}
              strokeDashoffset={x.offset}
              onMouseEnter={() => setHover(x.key)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-[stroke-width] duration-200"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-['Playfair_Display',serif] text-4xl font-bold tabular-nums text-[#14234b]">{focus ? focus.value : Math.round(a)}%</p>
            <p className="text-xs font-medium text-slate-500">{focus ? focus.label : "Active"}</p>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {arcs.map((x) => (
          <li
            key={x.key}
            onMouseEnter={() => setHover(x.key)}
            onMouseLeave={() => setHover(null)}
            className={`flex cursor-default items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition ${hover === x.key ? "bg-slate-100" : ""}`}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: x.color }} />
            {x.label}
            <span className="ml-3 tabular-nums text-slate-400">{x.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Panel = ({ children, className = "", style }) => (
  <div className={`rise relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100 ${className}`} style={style}>
    <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
    <div className="flex flex-1 flex-col p-6 sm:p-7">{children}</div>
  </div>
);

/* ───────────── page ───────────── */
export default function SuperAdminDashboard({ user = { name: "Super Admin" }, onViewAll }) {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [system, setSystem] = useState(INITIAL_SYSTEM);
  const [activities, setActivities] = useState(seedActivities);
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const nextId = useRef(100);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // keep the sparklines in step with the numbers
  useEffect(() => {
    setHistory((h) => ({
      users: [...h.users.slice(-7), stats.users],
      admins: [...h.admins.slice(-7), stats.admins],
      reports: [...h.reports.slice(-7), stats.reports],
      uptime: [...h.uptime.slice(-7), stats.uptime],
    }));
  }, [stats]);

  // simulated live updates (replace with websocket / polling of your API)
  useEffect(() => {
    const id = setInterval(() => {
      const types = Object.keys(ACTIVITY_META);
      const type = types[Math.floor(Math.random() * types.length)];
      setActivities((prev) => [{ id: nextId.current++, type, ts: Date.now(), fresh: true }, ...prev].slice(0, 12));
      if (type === "approved") setStats((s) => ({ ...s, users: s.users + 1 }));
      if (type === "report") setStats((s) => ({ ...s, reports: s.reports + 1 }));
      const active = 93 + Math.floor(Math.random() * 6);
      setSystem({ active, inactive: 100 - active });
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const visible = activities.slice(0, expanded ? 8 : 4);
  const healthy = system.active >= 95;
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f7f3ef] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .55s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-14px); background: #fff4d6 } to { opacity: 1; transform: none } }
        .slide-in { animation: slideIn .6s ease both; }
        @keyframes drawLine { to { stroke-dashoffset: 0 } }
        .spark-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: drawLine 1.3s cubic-bezier(.4,.1,.2,1) .2s forwards; }
        @media (prefers-reduced-motion: reduce) { .rise, .slide-in { animation: none; } .spark-draw { animation: none; stroke-dashoffset: 0; } }
      `}</style>

      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8f0014]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#14234b]/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex w-full flex-1 flex-col px-5 py-6 sm:px-8 lg:px-10">
        {/* ── Welcome banner with the key figures built in ── */}
        <section className="rise relative overflow-hidden rounded-3xl bg-[#14234b] shadow-xl">
          {campusBg && (
            <div className="absolute -inset-4 scale-105 bg-cover bg-center blur-[6px]" style={{ backgroundImage: `url(${campusBg})` }} aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-[#14234b]/92 via-[#1b2f63]/88 to-[#3a1230]/88" aria-hidden="true" />
          <span className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.06]" aria-hidden="true" />
          <span className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#8f0014]/30" aria-hidden="true" />
          <span className="absolute right-1/4 top-6 hidden h-24 w-24 rounded-full border border-[#f2c200]/30 lg:block" aria-hidden="true" />

          <div className="relative flex flex-wrap items-center gap-x-8 gap-y-6 p-6 sm:p-8">
            <img src={logo} alt="M.C.E. Society’s Abeda Inamdar Senior College crest" className="h-24 w-24 shrink-0 object-contain" />

            <div className="min-w-[16rem] flex-1 text-white">
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[#f2c200]">{greeting.toUpperCase()}</p>
              <h2 className="mt-1 font-['Playfair_Display',serif] text-3xl font-bold leading-tight sm:text-4xl">Welcome back, {user.name}</h2>
              <div className="mt-3 h-1 w-14 rounded-full bg-[#f2c200]" />
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
                Here is what is happening across Abeda Inamdar Senior College today.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15"><ShieldCheck size={13} className="text-[#f2c200]" /> NAAC Grade A</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15"><GraduationCap size={13} className="text-[#f2c200]" /> Affiliated to SPPU</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15"><Landmark size={13} className="text-[#f2c200]" /> Since 1948</span>
              </div>
            </div>

            <div className="hidden shrink-0 border-l-2 border-[#f2c200] pl-6 text-white xl:block">
              <p className="font-['Playfair_Display',serif] text-3xl font-bold italic text-[#f2c200]">Read to Lead</p>
              <p className="mt-1 text-[11px] font-medium tracking-[0.22em] text-white/60 uppercase">Educate • Empower • Excel</p>
            </div>
          </div>

          {/* key figures: one connected strip, no separate boxes */}
          <ul className="relative grid grid-cols-2 gap-px border-t border-white/15 bg-white/10 lg:grid-cols-4" aria-label="Key figures">
            {STAT_CARDS.map((c) => (
              <StatItem key={c.key} config={c} value={stats[c.key]} history={history[c.key]} />
            ))}
          </ul>
          <div className="relative h-1 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
        </section>

        {/* ── Overview + activities (fill the remaining height) ── */}
        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-5">
          <Panel className="lg:col-span-2" style={{ animationDelay: "350ms" }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#14234b]">System Overview</h2>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${healthy ? "bg-[#e3f3e8] text-[#1f9d55]" : "bg-[#fdeadb] text-[#e07a1f]"}`}>
                {healthy ? "Healthy" : "Needs attention"}
              </span>
            </div>
            <div className="flex flex-1 items-center">
              <Donut active={system.active} inactive={system.inactive} />
            </div>
          </Panel>

          <Panel className="lg:col-span-3" style={{ animationDelay: "430ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-['Playfair_Display',serif] text-xl font-bold text-[#14234b]">
                Recent Activities
                <Radio size={14} className="text-[#1f9d55]" aria-hidden="true" />
              </h2>
              <button
                onClick={() => {
                  setExpanded(!expanded);
                  onViewAll && onViewAll();
                }}
                className="text-sm font-semibold text-[#8f0014] transition hover:underline"
              >
                {expanded ? "Show Less" : "View All ›"}
              </button>
            </div>

            <ul className="flex flex-1 flex-col divide-y divide-slate-100" aria-live="polite">
              {visible.map((a) => {
                const m = ACTIVITY_META[a.type];
                return (
                  <li key={a.id} className={`flex flex-1 items-center gap-4 rounded-xl px-2 py-3.5 transition hover:bg-slate-50 ${a.fresh ? "slide-in" : ""}`}>
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${m.bg} ${m.fg}`}><m.icon size={20} /></span>
                    <span className="flex-1 text-sm font-semibold text-[#14234b]">{m.title}</span>
                    <time className="text-xs text-slate-400">{timeAgo(a.ts, now)}</time>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          © 2026 M.C.E. Society’s Abeda Inamdar Senior College · <span className="font-['Playfair_Display',serif] italic">Read to Lead</span>
        </p>
      </div>
    </div>
  );
}