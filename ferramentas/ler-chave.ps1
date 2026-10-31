# Le a chave da ElevenLabs sem mostrar na tela (mostra * por letra) e a devolve na saida padrao, para o .bat guardar so numa variavel de ambiente
# deste processo. O texto do pedido vai para a saida de erro (nao entra na captura). Nada e gravado em arquivo.
[Console]::Error.Write("Cole a chave da ElevenLabs (ela nao aparece) e aperte Enter: ")
$k = ""
while ($true) {
  $t = [Console]::ReadKey($true)
  if ($t.Key -eq "Enter") { break }
  elseif ($t.Key -eq "Backspace") { if ($k.Length -gt 0) { $k = $k.Substring(0, $k.Length - 1); [Console]::Error.Write("`b `b") } }
  elseif ($t.KeyChar -ne [char]0) { $k += $t.KeyChar; [Console]::Error.Write("*") }
}
[Console]::Error.WriteLine("")
Write-Output $k.Trim()
